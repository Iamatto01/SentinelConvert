# SentinelConvert

SentinelConvert is a local web system for multi-format conversion and image background removal.

## What it does

- Converts image files between common image formats (png, jpg, jpeg, webp, bmp, tiff, gif, ico).
- Exports images to svg by embedding the converted raster image in an SVG wrapper.
- Converts media files (audio/video) through FFmpeg when FFmpeg is installed.
- Converts documents through Pandoc when Pandoc is installed.
- Converts structured files between CSV and JSON natively.
- Packages any file into archive formats (zip, tar, tar.gz, tar.bz2, tar.xz).
- Removes image backgrounds using `rembg`.

## Important limitation

A true "every file to every file" converter does not exist universally because formats have incompatible content models. This system provides a broad conversion engine with plugin-style fallbacks:

- Native conversion when possible.
- FFmpeg for media.
- Pandoc for documents.

## Setup (Windows PowerShell)

1. Create and activate a virtual environment:

   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```

2. Install dependencies:

   ```powershell
   pip install -r requirements.txt
   ```

3. Optional but recommended:

   - Install FFmpeg and add it to PATH for audio/video conversion.
   - Install Pandoc and add it to PATH for document conversion.

4. Start the app:

   ```powershell
   uvicorn app.main:app --reload
   ```

5. Open browser:

   - <http://127.0.0.1:8000>

## API endpoints

- `GET /api/health`
- `GET /api/capabilities`
- `POST /api/convert`
  - form-data: `file`, `target_format`
- `POST /api/image/process`
  - form-data: `file`, `target_format`, `remove_background`

## Notes

- Background removal quality depends on model performance in `rembg`.
- The first background-removal request can be slower because `rembg` may download and warm up its model.
- Converting transparent images to JPEG will flatten transparency to white.
- SVG export preserves pixels (embedded PNG in SVG) rather than true vector tracing.
