/* ═══════════════════════════════════════════════════════
   SentinelConvert v2 — One-Stop Student Toolkit
   Main App: Router, Tool Registry, Common UI
   ═══════════════════════════════════════════════════════ */

// PDF.js worker
if (typeof pdfjsLib !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
}

/* ── Tool Registry ── */
const TOOLS = [];
function registerTool(tool) { TOOLS.push(tool); }

/* ── Helpers ── */
function esc(s) { return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function humanSize(b) { if(b<1024) return b+" B"; if(b<1048576) return (b/1024).toFixed(1)+" KB"; return (b/1048576).toFixed(2)+" MB"; }
function stem(f) { const d=f.lastIndexOf("."); return d>0?f.slice(0,d):f; }
function download(blob, name) { const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=name; a.click(); }

/* ── Ad HTML ── */
function adSlotHTML() {
  return `<div class="ad-slot" aria-label="Advertisement">
    <span class="ad-label">Advertisement</span>
    <ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-6189259537245687" data-ad-slot="auto" data-ad-format="auto" data-full-width-responsive="true"></ins>
  </div>`;
}
function refreshAdSlots() {
  document.querySelectorAll(".ad-slot .adsbygoogle").forEach((ins) => {
    const slot = ins.closest(".ad-slot");
    if (!slot) return;

    const status = ins.getAttribute("data-ad-status");
    if (status === "unfilled") {
      slot.classList.add("ad-slot-empty");
      return;
    }

    slot.classList.remove("ad-slot-empty");
  });
}
function pushAds() {
  try { (adsbygoogle = window.adsbygoogle || []).push({}); } catch(e){}
  setTimeout(refreshAdSlots, 800);
  setTimeout(refreshAdSlots, 2000);
}

/* ── Router ── */
const app = document.getElementById("app");

function navigate(toolId) {
  if (toolId) { location.hash = "#/" + toolId; } else { location.hash = ""; }
}

function handleRoute() {
  const hash = location.hash.replace("#/","");
  const tool = TOOLS.find(t => t.id === hash);
  if (tool) { renderToolView(tool); } else { renderHome(); }
}

window.addEventListener("hashchange", handleRoute);

/* ── Render Home (Tool Grid) ── */
function renderHome() {
  const categories = {};
  TOOLS.forEach(t => {
    if (!categories[t.category]) categories[t.category] = { icon: t.catIcon, tools: [] };
    categories[t.category].tools.push(t);
  });

  let html = `
    <header class="site-header">
      <span class="logo">⬡</span>
      <h1 class="site-title">SentinelConvert</h1>
      <p class="site-sub">Your One-Stop Student Toolkit — 100% free, runs in your browser</p>
      <div class="badges">
        <span class="badge">🔒 100% Private</span>
        <span class="badge">☁️ No Server</span>
        <span class="badge">⚡ Free Forever</span>
      </div>
    </header>
    <div class="search-wrap">
      <input type="text" class="search-input" id="toolSearch" placeholder="Search tools..." />
    </div>
    ${adSlotHTML()}`;

  for (const [catName, cat] of Object.entries(categories)) {
    html += `<section class="category" data-cat="${esc(catName)}">
      <h2 class="category-title"><span class="cat-icon">${cat.icon}</span> ${esc(catName)}</h2>
      <div class="tool-grid">`;
    cat.tools.forEach(t => {
      html += `<a class="tool-card" href="#/${t.id}" data-search="${esc((t.name+' '+t.desc+' '+catName).toLowerCase())}">
        <span class="tc-icon">${t.icon}</span>
        <span class="tc-name">${esc(t.name)}</span>
        <span class="tc-desc">${esc(t.desc)}</span>
      </a>`;
    });
    html += `</div></section>`;
  }

  html += adSlotHTML();
  app.innerHTML = html;

  // Search
  document.getElementById("toolSearch").addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll(".tool-card").forEach(c => {
      c.style.display = c.dataset.search.includes(q) ? "" : "none";
    });
    document.querySelectorAll(".category").forEach(s => {
      const visible = s.querySelectorAll('.tool-card[style=""], .tool-card:not([style])').length;
      s.style.display = visible > 0 || !q ? "" : "none";
    });
  });

  pushAds();
}

/* ── Render Tool View ── */
function renderToolView(tool) {
  const container = document.createElement("div");
  container.className = "tool-view";
  container.innerHTML = `
    <div class="tool-topbar">
      <button class="btn-back" id="btnBack">← Back</button>
      <h2 class="tool-heading">${tool.icon} ${esc(tool.name)}</h2>
    </div>
    <div id="toolBody"></div>
    ${adSlotHTML()}`;

  app.innerHTML = "";
  app.appendChild(container);

  container.querySelector("#btnBack").addEventListener("click", () => navigate());
  tool.render(container.querySelector("#toolBody"));
  pushAds();
}

/* ── Common: Create Drop Zone ── */
function createDropZone(parent, { accept, multiple, label, sublabel, onFiles }) {
  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <div class="drop-zone" tabindex="0">
      <div class="dz-icon">📂</div>
      <p class="dz-label">${label || "Drop files here or click to browse"}</p>
      <p class="dz-sub">${sublabel || ""}</p>
    </div>
    <input type="file" ${accept?`accept="${accept}"`:""}  ${multiple?"multiple":""} hidden />`;
  parent.appendChild(wrap);

  const dz = wrap.querySelector(".drop-zone");
  const inp = wrap.querySelector("input[type=file]");

  dz.addEventListener("click", () => inp.click());
  dz.addEventListener("keydown", e => { if(e.key==="Enter"||e.key===" ") inp.click(); });
  dz.addEventListener("dragover", e => { e.preventDefault(); dz.classList.add("drag-over"); });
  dz.addEventListener("dragleave", () => dz.classList.remove("drag-over"));
  dz.addEventListener("drop", e => { e.preventDefault(); dz.classList.remove("drag-over"); onFiles(Array.from(e.dataTransfer.files)); });
  inp.addEventListener("change", () => { onFiles(Array.from(inp.files)); inp.value=""; });

  return wrap;
}

/* ── Common: File List ── */
function createFileList(parent, files, { onRemove, showReorder } = {}) {
  let el = parent.querySelector(".tv-file-list");
  if (el) el.remove();
  if (files.length === 0) return;

  el = document.createElement("div");
  el.className = "tv-file-list";
  files.forEach((f, i) => {
    const row = document.createElement("div");
    row.className = "tv-file-item";
    row.innerHTML = `
      ${showReorder ? `<button class="tv-file-move" data-dir="up" data-idx="${i}" title="Move up">▲</button><button class="tv-file-move" data-dir="down" data-idx="${i}" title="Move down">▼</button>` : ""}
      <span class="tv-file-icon">📄</span>
      <span class="tv-file-name" title="${esc(f.name)}">${esc(f.name)}</span>
      <span class="tv-file-size">${humanSize(f.size)}</span>
      <button class="tv-file-remove" data-idx="${i}" title="Remove">✕</button>`;
    el.appendChild(row);
  });
  parent.appendChild(el);

  el.querySelectorAll(".tv-file-remove").forEach(btn => {
    btn.addEventListener("click", () => onRemove && onRemove(+btn.dataset.idx));
  });
  if (showReorder) {
    el.querySelectorAll(".tv-file-move").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = +btn.dataset.idx;
        const dir = btn.dataset.dir;
        if (dir==="up" && idx>0) { [files[idx-1],files[idx]]=[files[idx],files[idx-1]]; }
        if (dir==="down" && idx<files.length-1) { [files[idx],files[idx+1]]=[files[idx+1],files[idx]]; }
        createFileList(parent, files, { onRemove, showReorder });
      });
    });
  }
}

/* ── Common: Status & Results ── */
function showStatus(parent, text, type="loading") {
  let el = parent.querySelector(".status-bar");
  if (!el) { el = document.createElement("div"); parent.appendChild(el); }
  el.className = `status-bar ${type}`;
  el.textContent = text;
  return el;
}
function clearStatus(parent) {
  const el = parent.querySelector(".status-bar");
  if (el) el.remove();
}
function addResult(parent, blob, filename) {
  let area = parent.querySelector(".result-area");
  if (!area) { area = document.createElement("div"); area.className = "result-area"; parent.appendChild(area); }
  const url = URL.createObjectURL(blob);
  const row = document.createElement("div");
  row.className = "result-item";
  row.innerHTML = `<span class="result-icon">✅</span><span class="result-name">${esc(filename)}</span><a class="result-dl" href="${url}" download="${esc(filename)}">⬇ Download</a>`;
  area.appendChild(row);
}
function clearResults(parent) {
  const area = parent.querySelector(".result-area");
  if (area) area.innerHTML = "";
}

/* ── Feedback Modal ── */
function initFeedbackModal() {
  const feedbackBtn = document.getElementById("feedbackBtn");
  const feedbackModal = document.getElementById("feedbackModal");
  const feedbackForm = document.getElementById("feedbackForm");
  const feedbackCloseBtn = document.getElementById("feedbackCloseBtn");
  const feedbackCancelBtn = document.getElementById("feedbackCancelBtn");
  const feedbackBackdrop = document.getElementById("feedbackBackdrop");
  const feedbackStatus = document.getElementById("feedbackStatus");

  function openModal() {
    feedbackModal.classList.add("active");
    feedbackForm.reset();
    feedbackStatus.textContent = "";
    feedbackStatus.className = "feedback-status";
  }

  function closeModal() {
    feedbackModal.classList.remove("active");
  }

  feedbackBtn.addEventListener("click", openModal);
  feedbackCloseBtn.addEventListener("click", closeModal);
  feedbackCancelBtn.addEventListener("click", closeModal);
  feedbackBackdrop.addEventListener("click", closeModal);

  feedbackForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const message = document.getElementById("feedbackMessage").value;

    // Build mailto link with comment
    const subject = `SentinelConvert Feedback`;
    const body = `${message}`;
    const mailtoLink = `mailto:muhammadsaifudinmj@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    // Show success message
    feedbackStatus.textContent = "✓ Opening your email client...";
    feedbackStatus.className = "feedback-status success";

    // Open email client
    window.location.href = mailtoLink;

    // Close modal after a moment
    setTimeout(closeModal, 1500);
  });
}

/* ── Init: load tools then render ── */
window.addEventListener("DOMContentLoaded", () => {
  // Tools are registered via separate <script> files
  // Wait a tick to ensure all tool scripts have run
  setTimeout(handleRoute, 0);
  initFeedbackModal();
});
