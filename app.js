/* ═══════════════════════════════════════════════════════════════
   SentinelConvert — 100% Client-Side File Converter
   No server needed. Everything runs in your browser.
   ═══════════════════════════════════════════════════════════════ */

/* ─── Extension → allowed target formats map ─── */
const EXT_TARGETS = {
  // Raster images (Canvas API)
  png:  { group: "image", targets: ["jpg","webp","bmp","gif","svg"], isImage: true },
  jpg:  { group: "image", targets: ["png","webp","bmp","gif","svg"], isImage: true },
  jpeg: { group: "image", targets: ["png","webp","bmp","gif","svg"], isImage: true },
  webp: { group: "image", targets: ["png","jpg","bmp","gif","svg"], isImage: true },
  bmp:  { group: "image", targets: ["png","jpg","webp","gif","svg"], isImage: true },
  gif:  { group: "image", targets: ["png","jpg","webp","bmp","svg"], isImage: true },
  ico:  { group: "image", targets: ["png","jpg","webp"], isImage: true },
  // Audio (ffmpeg.wasm)
  mp3:  { group: "audio", targets: ["wav","ogg","flac","aac"] },
  wav:  { group: "audio", targets: ["mp3","ogg","flac","aac"] },
  ogg:  { group: "audio", targets: ["mp3","wav","flac","aac"] },
  flac: { group: "audio", targets: ["mp3","wav","ogg","aac"] },
  m4a:  { group: "audio", targets: ["mp3","wav","ogg","flac"] },
  aac:  { group: "audio", targets: ["mp3","wav","ogg","flac"] },
  // Video (ffmpeg.wasm)
  mp4:  { group: "video", targets: ["webm","mkv","avi","mov","mp3","wav"] },
  mov:  { group: "video", targets: ["mp4","webm","avi"] },
  mkv:  { group: "video", targets: ["mp4","webm","avi"] },
  avi:  { group: "video", targets: ["mp4","webm","mkv"] },
  webm: { group: "video", targets: ["mp4","mkv","avi"] },
  wmv:  { group: "video", targets: ["mp4","webm","avi"] },
  // Structured (pure JS)
  csv:  { group: "data", targets: ["json"] },
  json: { group: "data", targets: ["csv"] },
  // Archives (JSZip)
  zip:  { group: "archive", targets: [] },
};

/* ─── Helpers ─── */
function getExt(filename) {
  const lower = filename.toLowerCase();
  const dot = lower.lastIndexOf(".");
  return dot !== -1 ? lower.slice(dot + 1) : "";
}

function humanSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function escHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function stemOf(filename) {
  const dot = filename.lastIndexOf(".");
  return dot !== -1 ? filename.slice(0, dot) : filename;
}

/* ─── Lazy-loaded modules ─── */
let ffmpegInstance = null;
let bgRemovalModule = null;

/* ── Global Loader UI ── */
const globalLoader  = document.getElementById("globalLoader");
const loaderProgress = document.getElementById("loaderProgress");
const loaderText    = document.getElementById("loaderText");

function showLoader(text, pct) {
  globalLoader.classList.remove("hidden");
  loaderText.textContent = text;
  loaderProgress.style.width = `${pct}%`;
}
function hideLoader() {
  globalLoader.classList.add("hidden");
  loaderProgress.style.width = "0%";
}

/* ═══════════════════════════════════════════
   CONVERSION ENGINES (all client-side)
   ═══════════════════════════════════════════ */

/* ── 1. Image Conversion (Canvas API) ── */
function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { resolve(img); URL.revokeObjectURL(url); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Failed to load image")); };
    img.src = url;
  });
}

async function convertImage(file, targetExt) {
  const img = await loadImageFromFile(file);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");

  // SVG export → embed raster as base64 in SVG wrapper
  if (targetExt === "svg") {
    ctx.drawImage(img, 0, 0);
    const pngDataUrl = canvas.toDataURL("image/png");
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}">
  <image width="${canvas.width}" height="${canvas.height}" href="${pngDataUrl}" />
</svg>`;
    return new Blob([svg], { type: "image/svg+xml" });
  }

  // JPEG/BMP → fill white background (no transparency)
  const noAlpha = ["jpg", "jpeg", "bmp"].includes(targetExt);
  if (noAlpha) {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(img, 0, 0);

  const mimeMap = {
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
    webp: "image/webp", bmp: "image/bmp", gif: "image/gif",
  };
  const mime = mimeMap[targetExt] || "image/png";
  const quality = ["jpg","jpeg","webp"].includes(targetExt) ? 0.92 : undefined;

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error(`Browser doesn't support exporting to ${targetExt}`));
    }, mime, quality);
  });
}

/* ── 2. Background Removal (@imgly/background-removal) ── */
async function removeBackground(file) {
  if (!bgRemovalModule) {
    showLoader("Downloading AI model for background removal (first time only)…", 10);
    try {
      bgRemovalModule = await import("https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.5/+esm");
      showLoader("AI model loaded", 100);
    } catch (e) {
      hideLoader();
      throw new Error("Failed to load background removal model: " + e.message);
    }
  }
  showLoader("Removing background…", 50);
  const blob = await bgRemovalModule.removeBackground(file, {
    progress: (key, current, total) => {
      if (total > 0) {
        const pct = Math.round((current / total) * 100);
        showLoader(`Removing background… ${pct}%`, pct);
      }
    }
  });
  hideLoader();
  return blob; // returns PNG blob
}

/* ── 3. Media Conversion (ffmpeg.wasm) ── */
async function ensureFFmpeg() {
  if (ffmpegInstance) return ffmpegInstance;

  showLoader("Downloading FFmpeg engine (first time only, ~31MB)…", 5);

  const { FFmpeg } = await import("https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/+esm");
  const { fetchFile, toBlobURL } = await import("https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/+esm");

  const ffmpeg = new FFmpeg();

  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";

  ffmpeg.on("progress", ({ progress }) => {
    showLoader(`Converting media… ${Math.round(progress * 100)}%`, Math.round(progress * 100));
  });

  showLoader("Loading FFmpeg core…", 30);
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
  });

  showLoader("FFmpeg ready", 100);

  // Store fetchFile for later use
  ffmpeg._fetchFile = fetchFile;
  ffmpegInstance = ffmpeg;
  return ffmpeg;
}

async function convertMedia(file, targetExt) {
  const ffmpeg = await ensureFFmpeg();
  const inputName = "input." + getExt(file.name);
  const outputName = "output." + targetExt;

  showLoader("Writing file to virtual filesystem…", 20);
  await ffmpeg.writeFile(inputName, await ffmpeg._fetchFile(file));

  showLoader("Converting…", 30);
  await ffmpeg.exec(["-i", inputName, outputName]);

  const data = await ffmpeg.readFile(outputName);
  hideLoader();

  // Clean up virtual FS
  try { await ffmpeg.deleteFile(inputName); } catch {}
  try { await ffmpeg.deleteFile(outputName); } catch {}

  return new Blob([data.buffer], { type: "application/octet-stream" });
}

/* ── 4. CSV ↔ JSON (Pure JS) ── */
function csvToJson(csvText) {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) throw new Error("CSV must have at least a header and one data row");

  const headers = parseCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ""; });
    rows.push(row);
  }
  return JSON.stringify(rows, null, 2);
}

function jsonToCsv(jsonText) {
  const data = JSON.parse(jsonText);
  const arr = Array.isArray(data) ? data : [data];
  if (arr.length === 0) throw new Error("JSON is empty");
  if (typeof arr[0] !== "object") throw new Error("JSON must contain objects");

  const headers = [];
  arr.forEach((row) => {
    Object.keys(row).forEach((k) => { if (!headers.includes(k)) headers.push(k); });
  });

  const csvLines = [headers.map(escCSV).join(",")];
  arr.forEach((row) => {
    csvLines.push(headers.map((h) => escCSV(String(row[h] ?? ""))).join(","));
  });
  return csvLines.join("\n");
}

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else current += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { result.push(current.trim()); current = ""; }
      else current += c;
    }
  }
  result.push(current.trim());
  return result;
}

function escCSV(val) {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

async function convertStructured(file, targetExt) {
  const text = await file.text();
  const sourceExt = getExt(file.name);

  if (sourceExt === "csv" && targetExt === "json") {
    return new Blob([csvToJson(text)], { type: "application/json" });
  }
  if (sourceExt === "json" && targetExt === "csv") {
    return new Blob([jsonToCsv(text)], { type: "text/csv" });
  }
  throw new Error(`Cannot convert ${sourceExt} to ${targetExt}`);
}

/* ── 5. Create ZIP Archive (JSZip) ── */
async function createZipFromFiles(files) {
  if (typeof JSZip === "undefined") throw new Error("JSZip not loaded");
  const zip = new JSZip();
  for (const file of files) {
    zip.file(file.name, file);
  }
  return await zip.generateAsync({ type: "blob" });
}

/* ═══════════════════════════════════════════
   MASTER CONVERTER — routes to the right engine
   ═══════════════════════════════════════════ */
async function convertFile(item) {
  const { file, ext, info, selected: targetExt, removeBackground: doRemoveBg } = item;

  // Image with background removal
  if (info?.isImage && doRemoveBg) {
    const noBgBlob = await removeBackground(file);
    // If target is same as png (which removeBackground outputs), return directly
    if (targetExt === "png") return noBgBlob;
    // Otherwise convert the no-bg PNG to target format
    const noBgFile = new File([noBgBlob], "nobg.png", { type: "image/png" });
    return await convertImage(noBgFile, targetExt);
  }

  // Image conversion
  if (info?.isImage) {
    return await convertImage(file, targetExt);
  }

  // Media (audio/video)
  if (info?.group === "audio" || info?.group === "video") {
    return await convertMedia(file, targetExt);
  }

  // Structured data
  if (info?.group === "data") {
    return await convertStructured(file, targetExt);
  }

  throw new Error(`Conversion not supported for .${ext}`);
}


/* ═══════════════════════════════════════════
   UI STATE & DOM
   ═══════════════════════════════════════════ */
let fileItems = [];
let nextId = 0;

const dropZone      = document.getElementById("dropZone");
const fileInput     = document.getElementById("fileInput");
const folderInput   = document.getElementById("folderInput");
const btnPickFile   = document.getElementById("btnPickFile");
const btnPickFolder = document.getElementById("btnPickFolder");
const fileQueue     = document.getElementById("fileQueue");
const fileList      = document.getElementById("fileList");
const queueCount    = document.getElementById("queueCount");
const btnClearAll   = document.getElementById("btnClearAll");
const btnConvertAll = document.getElementById("btnConvertAll");

/* ── Drop zone events ── */
dropZone.addEventListener("click", (e) => {
  if (e.target === btnPickFile || e.target === btnPickFolder) return;
  fileInput.click();
});
dropZone.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") fileInput.click();
});
btnPickFile.addEventListener("click", (e) => { e.stopPropagation(); fileInput.click(); });
btnPickFolder.addEventListener("click", (e) => { e.stopPropagation(); folderInput.click(); });

dropZone.addEventListener("dragover", (e) => { e.preventDefault(); dropZone.classList.add("drag-over"); });
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("drag-over");
  addFiles(Array.from(e.dataTransfer.files));
});

fileInput.addEventListener("change", () => { addFiles(Array.from(fileInput.files)); fileInput.value = ""; });
folderInput.addEventListener("change", () => { addFiles(Array.from(folderInput.files)); folderInput.value = ""; });

btnClearAll.addEventListener("click", () => { fileItems = []; renderQueue(); });
btnConvertAll.addEventListener("click", convertAll);

/* ── Add files ── */
function addFiles(files) {
  files.forEach((file) => {
    const ext = getExt(file.name);
    const info = EXT_TARGETS[ext] || null;
    fileItems.push({
      id: nextId++,
      file,
      ext,
      info,
      selected: info && info.targets.length > 0 ? info.targets[0] : null,
      removeBackground: false,
    });
  });
  renderQueue();
}

/* ── Render queue ── */
function renderQueue() {
  fileList.replaceChildren();

  if (fileItems.length === 0) {
    fileQueue.classList.add("hidden");
    return;
  }
  fileQueue.classList.remove("hidden");
  queueCount.textContent = `${fileItems.length} file${fileItems.length !== 1 ? "s" : ""}`;

  fileItems.forEach((item) => {
    const li = document.createElement("li");
    li.className = "file-item";
    li.id = `item-${item.id}`;
    li.innerHTML = buildItemHTML(item);
    fileList.appendChild(li);
    attachItemEvents(li, item);
  });
}

function buildItemHTML(item) {
  const meta = `${item.ext.toUpperCase() || "?"} · ${humanSize(item.file.size)}`;
  const hasTargets = item.info && item.info.targets.length > 0;

  let formatSection = "";
  if (hasTargets) {
    const pills = item.info.targets.map((t) => {
      const sel = t === item.selected ? " selected" : "";
      return `<button class="fmt-pill${sel}" data-fmt="${t}" aria-label="Convert to ${t}">${t}</button>`;
    }).join("");
    formatSection = `
      <div class="format-row">
        <span class="format-label">Convert to:</span>
        ${pills}
      </div>`;
  } else if (item.info?.group === "archive") {
    formatSection = `<div class="format-row"><span class="format-label" style="color:var(--muted)">Archive file — no conversion needed</span></div>`;
  } else {
    formatSection = `<div class="format-row"><span class="format-label" style="color:var(--err)">Unsupported format</span></div>`;
  }

  const imageOpts = item.info?.isImage ? `
    <div class="image-opts">
      <label class="toggle-label" for="rmbg-${item.id}">
        <input type="checkbox" id="rmbg-${item.id}" ${item.removeBackground ? "checked" : ""}> Remove background (AI)
      </label>
    </div>` : "";

  return `
    <div class="file-info">
      <div class="file-name" title="${escHtml(item.file.name)}">${escHtml(item.file.name)}</div>
      <div class="file-meta">${meta}</div>
      ${formatSection}
      ${imageOpts}
      <div id="status-${item.id}" class="status-badge idle" style="display:inline-flex;margin-top:0.45rem">Ready</div>
      <span id="dl-${item.id}"></span>
      <span id="preview-${item.id}"></span>
    </div>
    <div class="file-controls">
      <button class="btn-remove-item" aria-label="Remove file" title="Remove">✕</button>
      <button class="btn-convert-one" ${!hasTargets ? "disabled" : ""}>Convert</button>
    </div>`;
}

function attachItemEvents(li, item) {
  li.querySelectorAll(".fmt-pill").forEach((pill) => {
    pill.addEventListener("click", () => {
      item.selected = pill.dataset.fmt;
      li.querySelectorAll(".fmt-pill").forEach((p) => p.classList.remove("selected"));
      pill.classList.add("selected");
    });
  });

  const rmbg = li.querySelector(`#rmbg-${item.id}`);
  if (rmbg) rmbg.addEventListener("change", () => { item.removeBackground = rmbg.checked; });

  li.querySelector(".btn-remove-item").addEventListener("click", () => {
    fileItems = fileItems.filter((f) => f.id !== item.id);
    renderQueue();
  });

  li.querySelector(".btn-convert-one").addEventListener("click", () => convertOne(item));
}

/* ── Convert single item ── */
async function convertOne(item) {
  const statusEl = document.getElementById(`status-${item.id}`);
  const dlEl     = document.getElementById(`dl-${item.id}`);
  const prevEl   = document.getElementById(`preview-${item.id}`);

  dlEl.innerHTML = "";
  prevEl.innerHTML = "";
  setStatus(statusEl, "Converting…", "loading");

  try {
    const t0 = performance.now();
    const resultBlob = await convertFile(item);
    const secs = ((performance.now() - t0) / 1000).toFixed(2);

    const outName = `${stemOf(item.file.name)}.${item.selected}`;
    const url = URL.createObjectURL(resultBlob);

    setStatus(statusEl, `Done (${secs}s)`, "ok");
    dlEl.innerHTML = `<br><a class="dl-link" href="${url}" download="${escHtml(outName)}">⬇ ${escHtml(outName)}</a>`;

    if (item.info?.isImage) {
      prevEl.innerHTML = `<br><img class="img-preview" src="${url}" alt="preview" />`;
    }
  } catch (err) {
    hideLoader();
    setStatus(statusEl, err.message, "error");
  }
}

async function convertAll() {
  const pending = fileItems.filter((i) => i.info && i.selected);
  for (const item of pending) {
    await convertOne(item);
  }
}

function setStatus(el, text, kind) {
  el.textContent = text;
  el.className = `status-badge ${kind}`;
}
