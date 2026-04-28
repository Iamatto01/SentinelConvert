# SentinelConvert

100% client-side file converter. Everything runs in your browser — no files are ever uploaded to a server.

## Features

- **Image conversion** — PNG, JPG, WEBP, BMP, GIF, SVG (via Canvas API)
- **AI Background removal** — Remove image backgrounds using on-device AI model
- **Video/Audio conversion** — MP4, WEBM, MKV, AVI, MP3, WAV, OGG, FLAC (via ffmpeg.wasm)
- **CSV ↔ JSON** — Convert structured data formats
- **ZIP archive** — Create ZIP files from multiple uploads
- **Folder batch** — Drop an entire folder and convert each file individually

## How it works

All processing happens locally in your browser using:

- **Canvas API** for image format conversion (zero dependencies, native browser)
- **@imgly/background-removal** for AI-powered background removal (ONNX model runs in WebAssembly)
- **ffmpeg.wasm** for audio/video conversion (FFmpeg compiled to WebAssembly)
- **JSZip** for archive creation
- **Pure JavaScript** for CSV ↔ JSON

No backend server is needed. Host it anywhere as static files.

## Privacy

Your files **never leave your device**. There is no server processing. Everything is computed locally using your browser's CPU/GPU.

## Deploy

### GitHub Pages (free)

1. Push this repo to GitHub
2. Go to **Settings → Pages → Source: main branch**
3. Your site is live at `https://yourusername.github.io/SentinalConvert`

### Vercel / Netlify (free)

1. Connect your GitHub repo
2. Deploy — no build step needed

### Local development

```bash
npx serve .
```

Then open http://localhost:3000

## Notes

- **First-time loading**: Background removal (~40MB AI model) and video conversion (~31MB FFmpeg engine) download on first use. They are cached by your browser after that.
- **Browser support**: Works best in Chrome/Edge. Firefox and Safari support most features.
- **SVG export**: Embeds raster image as base64 in SVG wrapper (not true vector tracing).
- **Document conversion**: Not supported client-side (Pandoc has no browser build).
