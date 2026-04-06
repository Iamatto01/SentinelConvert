from __future__ import annotations

import base64
from io import BytesIO
from typing import Any

from PIL import Image, UnidentifiedImageError

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

IMAGE_TARGET_EXTENSIONS = set(IMAGE_FORMAT_MAP) | {"svg"}


class ImageProcessingError(RuntimeError):
    """Raised when image processing cannot be completed."""


def process_image_bytes(
    source_bytes: bytes,
    target_format: str,
    remove_background: bool = False,
) -> tuple[bytes, str]:
    normalized_target = target_format.strip().lower().lstrip(".")
    if normalized_target not in IMAGE_TARGET_EXTENSIONS:
        raise ImageProcessingError(
            "Unsupported image target format. Use one of: "
            + ", ".join(sorted(IMAGE_TARGET_EXTENSIONS))
        )

    processed_bytes = source_bytes
    if remove_background:
        processed_bytes = _remove_background(source_bytes)

    try:
        with Image.open(BytesIO(processed_bytes)) as source_image:
            output_bytes = _serialize_image(source_image, normalized_target)
    except UnidentifiedImageError as exc:
        raise ImageProcessingError("The uploaded file is not a valid image.") from exc
    except OSError as exc:
        raise ImageProcessingError(f"Image processing failed: {exc}") from exc

    return output_bytes, normalized_target


def _remove_background(source_bytes: bytes) -> bytes:
    try:
        from rembg import remove
    except ImportError as exc:
        raise ImageProcessingError(
            "Background removal requires rembg. Install dependencies from requirements.txt."
        ) from exc

    try:
        return remove(source_bytes)
    except Exception as exc:  # pragma: no cover - model/runtime-dependent
        raise ImageProcessingError(f"Background removal failed: {exc}") from exc


def _serialize_image(image: Image.Image, target_format: str) -> bytes:
    converted = image.copy()
    save_options: dict[str, Any] = {}

    if target_format == "svg":
        return _serialize_svg_with_embedded_raster(converted)

    if target_format in {"jpg", "jpeg"}:
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
    elif target_format == "ico":
        converted = converted.convert("RGBA")
        save_options["sizes"] = [(256, 256)]

    output_buffer = BytesIO()
    converted.save(output_buffer, format=IMAGE_FORMAT_MAP[target_format], **save_options)
    return output_buffer.getvalue()


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
