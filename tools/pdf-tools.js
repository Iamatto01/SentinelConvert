/* PDF Merge Tool */
registerTool({
  id: "pdf-merge", name: "Merge PDF", icon: "📑", desc: "Combine multiple PDFs into one file",
  category: "PDF Tools", catIcon: "📄",
  render(body) {
    let files = [];
    const refresh = () => createFileList(body, files, { onRemove: i => { files.splice(i,1); refresh(); }, showReorder: true });

    createDropZone(body, {
      accept: ".pdf", multiple: true,
      label: "Drop PDF files here", sublabel: "You can add multiple PDFs and reorder them",
      onFiles(f) { files.push(...f); refresh(); }
    });

    const row = document.createElement("div"); row.className = "action-row";
    row.innerHTML = `<button class="btn-action" id="btnMerge">📑 Merge PDFs</button>`;
    body.appendChild(row);

    row.querySelector("#btnMerge").addEventListener("click", async () => {
      if (files.length < 2) return showStatus(body, "Add at least 2 PDF files", "error");
      clearResults(body); showStatus(body, "Merging PDFs…", "loading");
      try {
        const { PDFDocument } = PDFLib;
        const merged = await PDFDocument.create();
        for (const f of files) {
          const src = await PDFDocument.load(await f.arrayBuffer());
          const pages = await merged.copyPages(src, src.getPageIndices());
          pages.forEach(p => merged.addPage(p));
        }
        const bytes = await merged.save();
        const blob = new Blob([bytes], { type: "application/pdf" });
        clearStatus(body);
        addResult(body, blob, "merged.pdf");
        showStatus(body, `Merged ${files.length} PDFs successfully!`, "ok");
      } catch(e) { showStatus(body, "Error: " + e.message, "error"); }
    });
  }
});

/* PDF Split Tool */
registerTool({
  id: "pdf-split", name: "Split PDF", icon: "✂️", desc: "Extract specific pages from a PDF",
  category: "PDF Tools", catIcon: "📄",
  render(body) {
    let file = null;
    let pageCount = 0;

    createDropZone(body, {
      accept: ".pdf", multiple: false,
      label: "Drop a PDF file here", sublabel: "Then choose which pages to extract",
      onFiles: async (f) => {
        file = f[0]; createFileList(body, [file], { onRemove: () => { file=null; pageCount=0; } });
        try {
          const src = await PDFLib.PDFDocument.load(await file.arrayBuffer());
          pageCount = src.getPageCount();
          showStatus(body, `PDF has ${pageCount} pages. Enter page range below.`, "ok");
        } catch(e) { showStatus(body, "Could not read PDF: " + e.message, "error"); }
      }
    });

    const opts = document.createElement("div"); opts.className = "opts-panel";
    opts.innerHTML = `<div class="opt-group"><span class="opt-label">Pages (e.g. 1-3, 5, 7):</span>
      <input class="opt-input" id="pageRange" placeholder="1-3, 5" style="width:140px" /></div>`;
    body.appendChild(opts);

    const row = document.createElement("div"); row.className = "action-row";
    row.innerHTML = `<button class="btn-action" id="btnSplit">✂️ Extract Pages</button>`;
    body.appendChild(row);

    row.querySelector("#btnSplit").addEventListener("click", async () => {
      if (!file) return showStatus(body, "Add a PDF file first", "error");
      const rangeStr = document.getElementById("pageRange").value.trim();
      if (!rangeStr) return showStatus(body, "Enter page numbers", "error");

      const indices = parsePageRange(rangeStr, pageCount);
      if (indices.length === 0) return showStatus(body, "Invalid page range", "error");

      clearResults(body); showStatus(body, "Extracting pages…", "loading");
      try {
        const { PDFDocument } = PDFLib;
        const src = await PDFDocument.load(await file.arrayBuffer());
        const out = await PDFDocument.create();
        const pages = await out.copyPages(src, indices);
        pages.forEach(p => out.addPage(p));
        const bytes = await out.save();
        const blob = new Blob([bytes], { type: "application/pdf" });
        clearStatus(body);
        addResult(body, blob, `${stem(file.name)}_pages.pdf`);
        showStatus(body, `Extracted ${indices.length} page(s)!`, "ok");
      } catch(e) { showStatus(body, "Error: " + e.message, "error"); }
    });
  }
});

/* PDF Compress Tool */
registerTool({
  id: "pdf-compress", name: "Compress PDF", icon: "🗜️", desc: "Reduce PDF file size",
  category: "PDF Tools", catIcon: "📄",
  render(body) {
    let file = null;
    createDropZone(body, {
      accept: ".pdf", multiple: false,
      label: "Drop a PDF file here", sublabel: "Removes unnecessary metadata and compresses content",
      onFiles(f) { file = f[0]; createFileList(body, [file], { onRemove: () => file=null }); }
    });

    const row = document.createElement("div"); row.className = "action-row";
    row.innerHTML = `<button class="btn-action" id="btnCompress">🗜️ Compress PDF</button>`;
    body.appendChild(row);

    row.querySelector("#btnCompress").addEventListener("click", async () => {
      if (!file) return showStatus(body, "Add a PDF file first", "error");
      clearResults(body); showStatus(body, "Compressing PDF…", "loading");
      try {
        const { PDFDocument } = PDFLib;
        const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
        
        // Basic compression using pdf-lib (removes metadata/objects)
        // Advanced image compression is harder in browser without pdf.js rendering
        const bytes = await src.save({ useObjectStreams: true });
        const blob = new Blob([bytes], { type: "application/pdf" });
        
        clearStatus(body);
        addResult(body, blob, `${stem(file.name)}_compressed.pdf`);
        
        const oldSize = (file.size / 1024).toFixed(1);
        const newSize = (bytes.length / 1024).toFixed(1);
        showStatus(body, `Compressed! Size went from ${oldSize}KB to ${newSize}KB`, "ok");
      } catch(e) { showStatus(body, "Error: " + e.message, "error"); }
    });
  }
});

function parsePageRange(str, max) {
  const indices = new Set();
  str.split(",").forEach(part => {
    part = part.trim();
    if (part.includes("-")) {
      const [a, b] = part.split("-").map(Number);
      if (a && b) for (let i = a; i <= b && i <= max; i++) indices.add(i - 1);
    } else {
      const n = Number(part);
      if (n >= 1 && n <= max) indices.add(n - 1);
    }
  });
  return Array.from(indices).sort((a,b) => a-b);
}
