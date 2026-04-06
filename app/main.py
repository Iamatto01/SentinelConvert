from __future__ import annotations

import logging
import shutil
import tempfile
import time
from io import BytesIO
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from starlette.background import BackgroundTask

from .converter_engine import ConversionError, convert_file, get_capabilities
from .image_tools import ImageProcessingError, process_image_bytes

APP_TITLE = "SentinelConvert"
APP_VERSION = "1.0.0"
logger = logging.getLogger("uvicorn.error")

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

app = FastAPI(title=APP_TITLE, version=APP_VERSION)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


def _safe_filename(filename: str | None, fallback: str) -> str:
    if not filename:
        return fallback

    cleaned = Path(filename).name.strip()
    return cleaned or fallback


def _media_type_for_image(ext: str) -> str:
    if ext in {"jpg", "jpeg"}:
        return "image/jpeg"
    if ext == "svg":
        return "image/svg+xml"
    return f"image/{ext}"


def _cleanup_temp_dir(path: Path) -> None:
    shutil.rmtree(path, ignore_errors=True)


@app.get("/", response_class=HTMLResponse)
def read_home() -> str:
    return (STATIC_DIR / "index.html").read_text(encoding="utf-8")


@app.get("/api/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/capabilities", response_class=JSONResponse)
def capabilities() -> dict[str, object]:
    return get_capabilities()


@app.post("/api/convert")
async def convert_endpoint(
    file: UploadFile = File(...),
    target_format: str = Form(...),
) -> FileResponse:
    temp_dir = Path(tempfile.mkdtemp(prefix="sentinelconvert_"))
    started_at = time.perf_counter()

    try:
        uploaded_name = _safe_filename(file.filename, "uploaded.bin")
        source_path = temp_dir / uploaded_name
        source_bytes = await file.read()
        source_path.write_bytes(source_bytes)

        logger.info(
            "convert start file=%s target=%s size_bytes=%d",
            uploaded_name,
            target_format,
            len(source_bytes),
        )

        output_path = await run_in_threadpool(convert_file, source_path, target_format, temp_dir)
        elapsed_ms = (time.perf_counter() - started_at) * 1000
        logger.info(
            "convert done file=%s output=%s duration_ms=%.1f",
            uploaded_name,
            output_path.name,
            elapsed_ms,
        )

        return FileResponse(
            path=str(output_path),
            filename=output_path.name,
            media_type="application/octet-stream",
            background=BackgroundTask(_cleanup_temp_dir, temp_dir),
        )
    except ConversionError as exc:
        logger.warning("convert failed reason=%s", exc)
        _cleanup_temp_dir(temp_dir)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("convert crashed")
        _cleanup_temp_dir(temp_dir)
        raise HTTPException(status_code=500, detail=f"Unexpected conversion error: {exc}") from exc


@app.post("/api/image/process")
async def image_process_endpoint(
    file: UploadFile = File(...),
    target_format: str = Form("png"),
    remove_background: bool = Form(False),
) -> StreamingResponse:
    started_at = time.perf_counter()

    try:
        uploaded_name = _safe_filename(file.filename, "image")
        source_bytes = await file.read()
        logger.info(
            "image process start file=%s target=%s remove_background=%s size_bytes=%d",
            uploaded_name,
            target_format,
            remove_background,
            len(source_bytes),
        )

        processed_bytes, normalized_ext = await run_in_threadpool(
            process_image_bytes,
            source_bytes,
            target_format,
            remove_background,
        )
        elapsed_ms = (time.perf_counter() - started_at) * 1000
        logger.info(
            "image process done file=%s output_ext=%s remove_background=%s duration_ms=%.1f",
            uploaded_name,
            normalized_ext,
            remove_background,
            elapsed_ms,
        )
    except ImageProcessingError as exc:
        logger.warning("image process failed reason=%s", exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("image process crashed")
        raise HTTPException(status_code=500, detail=f"Unexpected image processing error: {exc}") from exc

    output_stem = Path(uploaded_name).stem
    output_name = f"{output_stem}_processed.{normalized_ext}"

    return StreamingResponse(
        BytesIO(processed_bytes),
        media_type=_media_type_for_image(normalized_ext),
        headers={"Content-Disposition": f'attachment; filename="{output_name}"'},
    )
