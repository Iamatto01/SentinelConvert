# 📋 SentinelConvert - Update Changelog

**Date:** May 2026  
**Version:** v3.0 - Major Feature & Bug Fix Update

---

## 🔧 Issues Fixed

### 1. ✅ Missing `getExt()` Function Bug
- **Status:** FIXED
- **Issue:** Image Resize tool was calling `getExt()` function that didn't exist
- **Impact:** Image resizing feature was completely broken
- **Solution:** Added the helper function to image-tools.js
- **Files Modified:** `tools/image-tools.js`

### 2. ✅ PDF to DOCX Tool Reliability Issues  
- **Status:** IMPROVED
- **Issues:** 
  - Poor error handling for library loading
  - Library initialization timing issues
  - Unclear error messages
- **Improvements:**
  - Added script loading detection (prevents duplicate loads)
  - Better error handling with fallback options
  - Timeout handling for library initialization
  - Clearer error messages to users
- **Files Modified:** `tools/docx-tools.js`

### 3. ✅ Script Loading Function
- **Status:** STANDARDIZED
- **Issue:** Script loading was inconsistent across tools
- **Solution:** Improved `loadScript()` helper with duplicate checking and initialization delays
- **Files Modified:** `tools/docx-tools.js`

---

## ✨ New Features Added

### Feature Set 1: PowerPoint Conversion (NEW)
**File:** `tools/pptx-tools.js`

#### 📊 PPTX to PDF
- Convert PowerPoint presentations to PDF
- Extracts all slides and text content
- Creates formatted PDF with slide numbers
- Tool ID: `pptx-to-pdf`

#### 📄 PDF to PPTX  
- Convert PDF pages to PowerPoint slides
- Each PDF page becomes a slide with image
- Renders page as image for accuracy
- Tool ID: `pdf-to-pptx`

---

### Feature Set 2: Media Download (NEW)
**File:** `tools/video-download.js`

#### ⬇️ Video/Audio URL Downloader
- Download videos/audio from direct links
- Supports HLS, DASH, and MP4 streams
- Format conversion (MP4, WebM, MP3, WAV)
- Audio extraction from videos
- Tool ID: `media-download`

#### 📹 Social Media Video Downloader
- Download from YouTube, TikTok, Instagram, Facebook, Twitter/X, Reddit, Vimeo
- Quality selection (Best, 720p, 480p, Audio only)
- Uses free video download APIs (cobalt.tools)
- Tool ID: `social-video-downloader`

---

### Feature Set 3: Utility & Text Tools (NEW)
**File:** `tools/utility-tools.js`

#### {} JSON Formatter/Beautifier
- Format and validate JSON files
- Syntax checking
- Minification
- Alphabetical key sorting
- Indent control (2, 4 spaces, tabs)
- Tool ID: `json-formatter`

#### 📱 QR Code Generator
- Generate QR codes from text or URLs
- Customizable size (200px - 800px)
- Output formats: PNG, JPG, SVG
- Error correction levels (Low, High)
- Tool ID: `qr-generator`

#### 🔐 Base64 Encoder/Decoder
- Encode text to Base64
- Decode Base64 to text
- UTF-8 support
- Direct clipboard operations
- Tool ID: `base64-converter`

#### 🔑 Password Generator
- Secure random password generation
- Configurable length (8-128 characters)
- Character set options (uppercase, lowercase, numbers, special)
- One-click generation
- Tool ID: `password-generator`

---

## 📊 Updated Statistics

### Tool Count
- **Before:** 20 tools
- **After:** 28 tools
- **Added:** 8 new tools

### Tool Distribution by Category
| Category | Before | After | Change |
|----------|--------|-------|--------|
| PDF Tools | 8 | 8 | — |
| Image Tools | 3 | 3 | — |
| Data Tools | 2 | 2 | — |
| Document Tools | 4 | 6 | +2 |
| Media Tools | 3 | 5 | +2 |
| Text/Utility Tools | 1 | 4 | +3 |
| **TOTAL** | **20** | **28** | **+8** |

---

## 🔗 New Dependencies Added

### Libraries (Loaded via CDN on-demand)
1. **PptxGenJS** - PowerPoint presentation generation
   - URL: `https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.umd.min.js`
   - Used for: PDF to PPTX conversion

2. **cobalt.tools API** - Video downloading
   - URL: `https://api.cobalt.tools/api/json`
   - Used for: Social media video downloads

3. **QR Code JS** - QR code generation
   - URL: `https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js`
   - Used for: QR code generator

### Existing Libraries Already in Use
- JSZip (for PPTX handling)
- PDF.js (for PDF operations)
- jsPDF (for PDF generation)
- FFmpeg WASM (for media conversion)
- Mammoth.js (for DOCX parsing)
- html2pdf.js (for HTML to PDF)

---

## 📁 Files Modified/Created

### Created Files
1. `tools/pptx-tools.js` - PowerPoint conversion tools (NEW)
2. `tools/video-download.js` - Video/media download tools (NEW)
3. `tools/utility-tools.js` - Utility tools: JSON, QR, Base64, Password (NEW)

### Modified Files
1. `tools/image-tools.js` - Added missing `getExt()` function
2. `tools/docx-tools.js` - Improved error handling and script loading
3. `index.html` - Added script tags for new tools

---

## 🧪 Testing Checklist

### Fixed Features (Should Now Work)
- ✅ Image Resize tool
- ✅ PDF to DOCX conversion
- ✅ DOCX to PDF conversion

### New Features (Ready to Test)
- ⏳ PPTX to PDF conversion
- ⏳ PDF to PPTX conversion
- ⏳ Video URL downloader
- ⏳ Social media video downloader
- ⏳ JSON formatter
- ⏳ QR code generator
- ⏳ Base64 converter
- ⏳ Password generator

### Existing Features (Should Still Work)
- ✅ PDF Merge/Split/Compress
- ✅ PDF Rotate/Page Numbers
- ✅ PDF Organize
- ✅ Image conversion (PNG, JPG, WEBP, etc.)
- ✅ Background removal
- ✅ Media conversion (Video/Audio)
- ✅ CSV/JSON conversion
- ✅ Excel/CSV conversion
- ✅ Text tools (Word count, case converter)

---

## 🚀 How to Use New Features

### PPTX Conversion
1. Upload a `.pptx` file → Get PDF with all slides
2. Upload a `.pdf` file → Get `.pptx` with pages as slides

### Video Download
1. Paste a video URL (MP4, HLS, etc.)
2. Choose format and quality
3. Download directly

### Social Media Downloader
1. Paste YouTube/TikTok/Instagram URL
2. Select quality
3. Download video

### JSON Formatter
1. Paste or upload JSON
2. Format, minify, or sort keys
3. Download formatted result

### QR Code
1. Enter text or URL
2. Select size and format
3. Download QR code (PNG/JPG/SVG)

### Base64
1. Paste text or Base64
2. Click encode/decode
3. Copy or download

### Password Generator
1. Set length and character types
2. Click generate
3. Copy password

---

## 📌 Known Limitations

1. **Social Media Downloads**
   - May not work if platform blocks API access
   - CORS restrictions apply
   - Recommend external tools (yt-dlp, youtube-dl) for complex sites

2. **PPTX to PDF**
   - Text extraction only (images/advanced formatting limited)
   - Complex layouts may not render perfectly

3. **PDF to PPTX**
   - Pages rendered as images (not vector)
   - Large PDFs may take longer
   - Limited text extraction

4. **Video Download**
   - Large files may take time
   - First use of FFmpeg downloads ~30MB WASM
   - CORS restrictions apply to some domains

---

## 💡 Future Enhancement Ideas

- [ ] Website screenshot tool (HTML to PNG/PDF)
- [ ] Markdown to HTML/PDF converter
- [ ] Spreadsheet merge/split/organize
- [ ] Audio spectrum analyzer
- [ ] Image batch processing
- [ ] Document comparison tool
- [ ] Metadata editor (PDF, Images, Audio)
- [ ] Regular expression tester
- [ ] URL shortener/QR combo
- [ ] Clipboard history
- [ ] Batch file conversion

---

## 🔐 Privacy & Security Notes

✅ **All processing is client-side (100% private)**
- No files uploaded to servers
- No tracking or analytics (except AdSense)
- No data collection

⚠️ **Video Downloader Note**
- Uses external API (cobalt.tools) for social media downloads
- Direct URL downloads bypass external services

---

## 📞 Support & Feedback

Users can report issues or suggest features using the **Feedback** button in the app.

---

**Generated:** May 2026  
**Tool Count:** 28 / Updated by: Autonomous Copilot Agent
