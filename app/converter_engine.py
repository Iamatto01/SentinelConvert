from __future__ import annotations

import base64
import csv
import json
import shutil
import subprocess
import tempfile
from io import BytesIO
from pathlib import Path
from typing import Any

from PIL import Image, UnidentifiedImageError

RASTER_IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "bmp", "tiff", "gif", "ico"}
IMAGE_TARGET_EXTENSIONS = RASTER_IMAGE_EXTENSIONS | {"svg"}
MEDIA_EXTENSIONS = {
    "mp3",
    "wav",
    "ogg",
    "flac",
    "m4a",
    "aac",
    "mp4",
    "mov",
    "mkv",
    "avi",
    "webm",
    "wmv",
}
STRUCTURED_EXTENSIONS = {"csv", "json"}

# Handled by pandoc when available in PATH.
DOCUMENT_EXTENSIONS = {
    "txt",
    "md",
    "rst",
    "html",
    "htm",
    "docx",
    "odt",
    "pdf",
    "rtf",
    "epub",
    "latex",
    "tex",
}

ARCHIVE_ALIASES = {
    "zip": "zip",
    "tar": "tar",
    "tar.gz": "gztar",
    "tgz": "gztar",
    "tar.bz2": "bztar",
    "tbz2": "bztar",
    "tar.xz": "xztar",
    "txz": "xztar",
}

ARCHIVE_SUFFIX_ORDER = [
    (".tar.gz", "tar.gz"),
    (".tgz", "tgz"),
    (".tar.bz2", "tar.bz2"),
    (".tbz2", "tbz2"),
    (".tar.xz", "tar.xz"),
    (".txz", "txz"),
    (".zip", "zip"),
    (".tar", "tar"),
]

IMAGE_FORMAT_MAP = {
    "png": "PNG",
    "jpg": "JPEG",
    "jpeg": "JPEG",
    "webp": "WEBP",
    "bmp": "BMP",
    "tiff": "TIFF",
    "gif": "GIF",
    "ico": "ICO",
}


class ConversionError(RuntimeError):
    """Raised when a requested conversion cannot be completed."""


def get_capabilities() -> dict[str, Any]:
    return {
        "image_formats": sorted(IMAGE_TARGET_EXTENSIONS),
        "media_formats": sorted(MEDIA_EXTENSIONS),
        "archive_formats": sorted(ARCHIVE_ALIASES.keys()),
        "structured_formats": sorted(STRUCTURED_EXTENSIONS),
        "document_formats_via_pandoc": sorted(DOCUMENT_EXTENSIONS),
        "notes": [
            "Pandoc is required for many document conversions.",
            "FFmpeg is required for audio/video conversions.",
            "Any source file can be packaged into an archive format.",
            "CSV and JSON can be converted both directions natively.",
            "SVG export from raster images uses an embedded PNG in SVG.",
        ],
    }


def detect_extension(path: Path) -> str:
    lowered_name = path.name.lower()
    for suffix, key in ARCHIVE_SUFFIX_ORDER:
        if lowered_name.endswith(suffix):
            return key

    if "." not in path.name:
        return ""

    return path.suffix.lower().lstrip(".")


def normalize_target_format(target_format: str) -> str:
    return target_format.strip().lower().lstrip(".")


def _derive_output_stem(path: Path, detected_source_ext: str) -> str:
    lowered_name = path.name.lower()
    full_ext = f".{detected_source_ext}" if detected_source_ext else ""

    if full_ext and lowered_name.endswith(full_ext):
        return path.name[: -len(full_ext)]

    return path.stem


def _build_output_name(stem: str, target_format: str) -> str:
    return f"{stem}.{target_format}"


def convert_file(source_path: Path, target_format: str, output_dir: Path | None = None) -> Path:
    if not source_path.exists():
        raise ConversionError("Source file does not exist.")

    normalized_target = normalize_target_format(target_format)
    if not normalized_target:
        raise ConversionError("Target format cannot be empty.")

    source_ext = detect_extension(source_path)
    output_stem = _derive_output_stem(source_path, source_ext)
    output_base = output_dir or source_path.parent
    output_path = output_base / _build_output_name(output_stem, normalized_target)

    if source_ext == normalized_target:
        shutil.copy2(source_path, output_path)
        return output_path

    if source_ext in RASTER_IMAGE_EXTENSIONS and normalized_target in IMAGE_TARGET_EXTENSIONS:
        _convert_image(source_path, output_path, normalized_target)
        return output_path

    if source_ext in STRUCTURED_EXTENSIONS and normalized_target in STRUCTURED_EXTENSIONS:
        _convert_structured(source_path, output_path, source_ext, normalized_target)
        return output_path

    if source_ext in MEDIA_EXTENSIONS and normalized_target in MEDIA_EXTENSIONS:
        _convert_media_ffmpeg(source_path, output_path)
        return output_path

    if normalized_target in ARCHIVE_ALIASES:
        return _convert_to_archive(source_path, source_ext, output_path, normalized_target)

    _convert_with_pandoc(source_path, output_path)
    return output_path


def _convert_image(source_path: Path, output_path: Path, target_ext: str) -> None:
    try:
        with Image.open(source_path) as source_image:
            converted = source_image.copy()
            save_options: dict[str, Any] = {}

            if target_ext == "svg":
                output_path.write_bytes(_serialize_svg_with_embedded_raster(converted))
                return

            if target_ext in {"jpg", "jpeg"}:
                if converted.mode in {"RGBA", "LA"} or (
                    converted.mode == "P" and "transparency" in converted.info
                ):
                    rgba = converted.convert("RGBA")
                    rgb_background = Image.new("RGB", rgba.size, (255, 255, 255))
                    rgb_background.paste(rgba, mask=rgba.getchannel("A"))
                    converted = rgb_background
                else:
                    converted = converted.convert("RGB")

                save_options["quality"] = 95
            elif target_ext == "ico":
                converted = converted.convert("RGBA")
                save_options["sizes"] = [(256, 256)]

            converted.save(output_path, format=IMAGE_FORMAT_MAP[target_ext], **save_options)
    except UnidentifiedImageError as exc:
        raise ConversionError("The uploaded file is not a valid image.") from exc
    except OSError as exc:
        raise ConversionError(f"Image conversion failed: {exc}") from exc


def _serialize_svg_with_embedded_raster(image: Image.Image) -> bytes:
    rgba_image = image.convert("RGBA")
    png_buffer = BytesIO()
    rgba_image.save(png_buffer, format="PNG")
    encoded_png = base64.b64encode(png_buffer.getvalue()).decode("ascii")

    width, height = rgba_image.size
    svg_markup = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
        f'viewBox="0 0 {width} {height}">\n'
        f'  <image width="{width}" height="{height}" href="data:image/png;base64,{encoded_png}" />\n'
        "</svg>\n"
    )
    return svg_markup.encode("utf-8")


def _convert_structured(
    source_path: Path,
    output_path: Path,
    source_ext: str,
    target_ext: str,
) -> None:
    if source_ext == target_ext:
        shutil.copy2(source_path, output_path)
        return

    if source_ext == "csv" and target_ext == "json":
        with source_path.open("r", encoding="utf-8-sig", newline="") as source_file:
            rows = list(csv.DictReader(source_file))

        with output_path.open("w", encoding="utf-8") as output_file:
            json.dump(rows, output_file, indent=2, ensure_ascii=False)
        return

    if source_ext == "json" and target_ext == "csv":
        with source_path.open("r", encoding="utf-8") as source_file:
            payload = json.load(source_file)

        if isinstance(payload, dict):
            payload = [payload]

        if not isinstance(payload, list):
            raise ConversionError("JSON must contain an object or a list of objects for CSV conversion.")

        if not payload:
            raise ConversionError("JSON payload is empty; cannot infer CSV columns.")

        headers = _collect_json_headers(payload)
        with output_path.open("w", encoding="utf-8", newline="") as output_file:
            writer = csv.DictWriter(output_file, fieldnames=headers)
            writer.writeheader()
            for item in payload:
                if not isinstance(item, dict):
                    raise ConversionError("All JSON list items must be objects for CSV conversion.")
                writer.writerow({header: item.get(header, "") for header in headers})
        return

    raise ConversionError(f"Structured conversion from {source_ext} to {target_ext} is not supported.")


def _collect_json_headers(items: list[dict[str, Any]]) -> list[str]:
    ordered_headers: list[str] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        for key in item.keys():
            if key not in ordered_headers:
                ordered_headers.append(key)
    return ordered_headers


def _convert_media_ffmpeg(source_path: Path, output_path: Path) -> None:
    command = ["ffmpeg", "-y", "-i", str(source_path), str(output_path)]

    try:
        result = subprocess.run(command, capture_output=True, text=True, check=False)
    except FileNotFoundError as exc:
        raise ConversionError("FFmpeg is not installed or not available in PATH.") from exc

    if result.returncode != 0:
        error = result.stderr.strip() or result.stdout.strip() or "Unknown FFmpeg error"
        raise ConversionError(f"Media conversion failed: {error}")


def _convert_to_archive(
    source_path: Path,
    source_ext: str,
    output_path: Path,
    target_archive_ext: str,
) -> Path:
    archive_format = ARCHIVE_ALIASES[target_archive_ext]

    with tempfile.TemporaryDirectory(prefix="sentinelconvert_archive_") as temp_dir:
        temp_root = Path(temp_dir)
        data_root = temp_root / "payload"
        data_root.mkdir(parents=True, exist_ok=True)

        if source_ext in ARCHIVE_ALIASES:
            try:
                shutil.unpack_archive(str(source_path), str(data_root))
            except (shutil.ReadError, ValueError) as exc:
                raise ConversionError("Could not read source archive for conversion.") from exc
        else:
            shutil.copy2(source_path, data_root / source_path.name)

        archive_base = _archive_base_name(output_path, target_archive_ext)
        generated_archive = shutil.make_archive(
            str(archive_base),
            archive_format,
            root_dir=str(data_root),
        )

    return Path(generated_archive)


def _archive_base_name(output_path: Path, target_archive_ext: str) -> Path:
    base = output_path
    if "." in target_archive_ext:
        for _ in target_archive_ext.split("."):
            base = base.with_suffix("")
    else:
        base = base.with_suffix("")
    return base


def _convert_with_pandoc(source_path: Path, output_path: Path) -> None:
    command = ["pandoc", str(source_path), "-o", str(output_path)]

    try:
        result = subprocess.run(command, capture_output=True, text=True, check=False)
    except FileNotFoundError as exc:
        raise ConversionError(
            "Pandoc is not installed or not available in PATH. Install pandoc for document conversions."
        ) from exc

    if result.returncode != 0:
        error = result.stderr.strip() or result.stdout.strip() or "Unknown pandoc error"
        raise ConversionError(f"Document conversion failed: {error}")
