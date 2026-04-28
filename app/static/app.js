/* ─── Extension → allowed target formats map ─── */
const EXT_TARGETS = {
  // Raster images
  png:  { group: "image", targets: ["jpg","jpeg","webp","bmp","tiff","gif","ico","svg"], isImage: true },
  jpg:  { group: "image", targets: ["png","webp","bmp","tiff","gif","ico","svg"],        isImage: true },
  jpeg: { group: "image", targets: ["png","webp","bmp","tiff","gif","ico","svg"],        isImage: true },
  webp: { group: "image", targets: ["png","jpg","bmp","tiff","gif","ico","svg"],         isImage: true },
  bmp:  { group: "image", targets: ["png","jpg","webp","tiff","gif","ico","svg"],        isImage: true },
  tiff: { group: "image", targets: ["png","jpg","webp","bmp","gif","ico","svg"],         isImage: true },
  gif:  { group: "image", targets: ["png","jpg","webp","bmp","tiff","ico","svg"],        isImage: true },
  ico:  { group: "image", targets: ["png","jpg","webp","bmp","svg"],                     isImage: true },
  // Media
  mp3:  { group: "audio", targets: ["wav","ogg","flac","m4a","aac"] },
  wav:  { group: "audio", targets: ["mp3","ogg","flac","m4a","aac"] },
  ogg:  { group: "audio", targets: ["mp3","wav","flac","m4a","aac"] },
  flac: { group: "audio", targets: ["mp3","wav","ogg","m4a","aac"] },
  m4a:  { group: "audio", targets: ["mp3","wav","ogg","flac","aac"] },
  aac:  { group: "audio", targets: ["mp3","wav","ogg","flac","m4a"] },
  mp4:  { group: "video", targets: ["webm","mkv","avi","mov","wmv","mp3","wav"] },
  mov:  { group: "video", targets: ["mp4","webm","mkv","avi","wmv"] },
  mkv:  { group: "video", targets: ["mp4","webm","avi","mov","wmv"] },
  avi:  { group: "video", targets: ["mp4","webm","mkv","mov","wmv"] },
  webm: { group: "video", targets: ["mp4","mkv","avi","mov","wmv"] },
  wmv:  { group: "video", targets: ["mp4","webm","mkv","avi","mov"] },
  // Docs
  txt:   { group: "doc", targets: ["md","html","pdf","docx","epub","odt","rtf"] },
  md:    { group: "doc", targets: ["html","pdf","docx","epub","odt","rtf","txt"] },
  rst:   { group: "doc", targets: ["html","pdf","docx","epub","md","txt"] },
  html:  { group: "doc", targets: ["pdf","docx","epub","odt","md","txt"] },
  htm:   { group: "doc", targets: ["pdf","docx","epub","odt","md","txt"] },
  docx:  { group: "doc", targets: ["pdf","html","epub","odt","md","txt","rtf"] },
  odt:   { group: "doc", targets: ["pdf","docx","html","epub","md","txt"] },
  rtf:   { group: "doc", targets: ["pdf","docx","html","md","txt"] },
  epub:  { group: "doc", targets: ["pdf","docx","html","odt","md","txt"] },
  latex: { group: "doc", targets: ["pdf","html","docx","md","txt"] },
  tex:   { group: "doc", targets: ["pdf","html","docx","md","txt"] },
  // Structured
  csv:  { group: "data", targets: ["json","zip"] },
  json: { group: "data", targets: ["csv","zip"] },
  // Archives
  zip:    { group: "archive", targets: ["tar","tar.gz","tar.bz2","tar.xz"] },
  tar:    { group: "archive", targets: ["zip","tar.gz","tar.bz2","tar.xz"] },
};

function getExt(filename) {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".tar.gz"))  return "tar.gz";
  if (lower.endsWith(".tar.bz2")) return "tar.bz2";
  if (lower.endsWith(".tar.xz"))  return "tar.xz";
  const dot = lower.lastIndexOf(".");
  return dot !== -1 ? lower.slice(dot + 1) : "";
}

function humanSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/* ─── State ─── */
let fileItems = []; // { id, file, ext, info, selected, removeBackground }
let nextId = 0;

/* ─── DOM Refs ─── */
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

/* ─── Drop zone events ─── */
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

fileInput.addEventListener("change", () => addFiles(Array.from(fileInput.files)));
folderInput.addEventListener("change", () => addFiles(Array.from(folderInput.files)));

btnClearAll.addEventListener("click", () => { fileItems = []; renderQueue(); });
btnConvertAll.addEventListener("click", convertAll);

/* ─── Add files ─── */
function addFiles(files) {
  files.forEach((file) => {
    const ext = getExt(file.name);
    const info = EXT_TARGETS[ext] || null;
    fileItems.push({
      id: nextId++,
      file,
      ext,
      info,
      selected: info ? info.targets[0] : null,
      removeBackground: false,
    });
  });
  renderQueue();
}

/* ─── Render ─── */
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
  } else {
    formatSection = `<div class="format-row"><span class="format-label" style="color:var(--err)">Unsupported format</span></div>`;
  }

  const imageOpts = item.info?.isImage ? `
    <div class="image-opts">
      <label class="toggle-label" for="rmbg-${item.id}">
        <input type="checkbox" id="rmbg-${item.id}" ${item.removeBackground ? "checked" : ""}> Remove background
      </label>
    </div>` : "";

  return `
    <div class="file-info">
      <div class="file-name" title="${escHtml(item.file.name)}">${escHtml(item.file.name)}</div>
      <div class="file-meta">${meta}</div>
      ${formatSection}
      ${imageOpts}
      <div id="status-${item.id}" class="status-badge idle" style="display:inline-flex;margin-top:0.45rem">Idle</div>
      <span id="dl-${item.id}"></span>
      <span id="preview-${item.id}"></span>
    </div>
    <div class="file-controls">
      <button class="btn-remove-item" aria-label="Remove file" title="Remove">✕</button>
      <button class="btn-convert-one" ${!hasTargets ? "disabled" : ""}>Convert</button>
    </div>`;
}

function attachItemEvents(li, item) {
  // Format pills
  li.querySelectorAll(".fmt-pill").forEach((pill) => {
    pill.addEventListener("click", () => {
      item.selected = pill.dataset.fmt;
      li.querySelectorAll(".fmt-pill").forEach((p) => p.classList.remove("selected"));
      pill.classList.add("selected");
    });
  });

  // Remove background checkbox
  const rmbg = li.querySelector(`#rmbg-${item.id}`);
  if (rmbg) rmbg.addEventListener("change", () => { item.removeBackground = rmbg.checked; });

  // Remove item
  li.querySelector(".btn-remove-item").addEventListener("click", () => {
    fileItems = fileItems.filter((f) => f.id !== item.id);
    renderQueue();
  });

  // Convert single
  li.querySelector(".btn-convert-one").addEventListener("click", () => convertOne(item));
}

/* ─── Convert ─── */
async function convertOne(item) {
  const statusEl = document.getElementById(`status-${item.id}`);
  const dlEl     = document.getElementById(`dl-${item.id}`);
  const prevEl   = document.getElementById(`preview-${item.id}`);

  dlEl.innerHTML = "";
  prevEl.innerHTML = "";
  setStatus(statusEl, "Converting…", "loading");

  try {
    const formData = new FormData();
    formData.append("file", item.file);
    formData.append("target_format", item.selected);

    const endpoint = item.info?.isImage ? "/api/image/process" : "/api/convert";
    if (item.info?.isImage) {
      formData.append("remove_background", item.removeBackground ? "true" : "false");
    }

    const t0 = performance.now();
    const res = await fetch(endpoint, { method: "POST", body: formData });

    if (!res.ok) {
      let msg = `Error ${res.status}`;
      try { const j = await res.json(); msg = j.detail || msg; } catch {}
      throw new Error(msg);
    }

    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const cd   = res.headers.get("content-disposition");
    const name = (cd && /filename="?([^";]+)"?/i.exec(cd)?.[1]) || `converted.${item.selected}`;
    const secs = ((performance.now() - t0) / 1000).toFixed(2);

    setStatus(statusEl, `Done (${secs}s)`, "ok");
    dlEl.innerHTML = `<br><a class="dl-link" href="${url}" download="${escHtml(name)}">⬇ ${escHtml(name)}</a>`;

    if (item.info?.isImage) {
      prevEl.innerHTML = `<br><img class="img-preview" src="${url}" alt="preview" />`;
    }
  } catch (err) {
    setStatus(statusEl, err.message, "error");
  }
}

async function convertAll() {
  const pending = fileItems.filter((i) => i.info && i.selected);
  for (const item of pending) {
    await convertOne(item);
  }
}

/* ─── Helpers ─── */
function setStatus(el, text, kind) {
  el.textContent = text;
  el.className = `status-badge ${kind}`;
}

function escHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
