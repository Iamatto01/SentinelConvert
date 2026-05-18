/* PDF → Image Tool */
registerTool({
  id: "pdf-to-image", name: "PDF to Image", icon: "🖼️", desc: "Convert PDF pages to JPG or PNG images",
  category: "PDF Tools", catIcon: "📄",
  render(body) {
    let file = null;
    createDropZone(body, {
      accept: ".pdf", multiple: false,
      label: "Drop a PDF file here", sublabel: "Each page will be converted to an image",
      onFiles(f) { file = f[0]; createFileList(body, [file], { onRemove: () => file=null }); }
    });

    const opts = document.createElement("div"); opts.className = "opts-panel";
    opts.innerHTML = `<div class="opt-group"><span class="opt-label">Format:</span>
      <select class="opt-select" id="imgFmt"><option value="image/jpeg">JPG</option><option value="image/png">PNG</option></select></div>
      <div class="opt-group"><span class="opt-label">Scale:</span>
      <select class="opt-select" id="imgScale"><option value="1">1x</option><option value="1.5">1.5x</option><option value="2" selected>2x</option></select></div>`;
    body.appendChild(opts);

    const row = document.createElement("div"); row.className = "action-row";
    row.innerHTML = `<button class="btn-action" id="btnConvert">🖼️ Convert to Images</button>`;
    body.appendChild(row);

    row.querySelector("#btnConvert").addEventListener("click", async () => {
      if (!file) return showStatus(body, "Add a PDF file first", "error");
      clearResults(body);
      const fmt = document.getElementById("imgFmt").value;
      const scale = +document.getElementById("imgScale").value;
      const ext = fmt.includes("png") ? "png" : "jpg";

      showStatus(body, "Loading PDF…", "loading");
      try {
        const data = new Uint8Array(await file.arrayBuffer());
        const pdf = await pdfjsLib.getDocument({ data }).promise;
        const total = pdf.numPages;

        for (let i = 1; i <= total; i++) {
          showStatus(body, `Converting page ${i} of ${total}…`, "loading");
          const page = await pdf.getPage(i);
          const vp = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = vp.width; canvas.height = vp.height;
          const ctx = canvas.getContext("2d");
          if (ext === "jpg") { ctx.fillStyle = "#fff"; ctx.fillRect(0,0,canvas.width,canvas.height); }
          await page.render({ canvasContext: ctx, viewport: vp }).promise;

          const blob = await new Promise(r => canvas.toBlob(r, fmt, 0.92));
          addResult(body, blob, `${stem(file.name)}_page${i}.${ext}`);
        }
        showStatus(body, `Converted ${total} pages!`, "ok");
      } catch(e) { showStatus(body, "Error: " + e.message, "error"); }
    });
  }
});

/* Image → PDF Tool */
registerTool({
  id: "image-to-pdf", name: "Image to PDF", icon: "📄", desc: "Combine images into a single PDF",
  category: "PDF Tools", catIcon: "📄",
  render(body) {
    let files = [];
    const refresh = () => createFileList(body, files, { onRemove: i => { files.splice(i,1); refresh(); }, showReorder: true });

    createDropZone(body, {
      accept: "image/*", multiple: true,
      label: "Drop images here", sublabel: "JPG, PNG, WEBP — each image becomes one PDF page",
      onFiles(f) { files.push(...f); refresh(); }
    });

    const row = document.createElement("div"); row.className = "action-row";
    row.innerHTML = `<button class="btn-action" id="btnMake">📄 Create PDF</button>`;
    body.appendChild(row);

    row.querySelector("#btnMake").addEventListener("click", async () => {
      if (files.length === 0) return showStatus(body, "Add images first", "error");
      clearResults(body); showStatus(body, "Creating PDF…", "loading");
      try {
        const { jsPDF } = window.jspdf;
        let pdf = null;

        for (let i = 0; i < files.length; i++) {
          showStatus(body, `Processing image ${i+1} of ${files.length}…`, "loading");
          const img = await loadImg(files[i]);
          const w = img.naturalWidth; const h = img.naturalHeight;
          const orient = w > h ? "landscape" : "portrait";

          if (i === 0) { pdf = new jsPDF({ orientation: orient, unit: "px", format: [w, h] }); }
          else { pdf.addPage([w, h], orient); }

          pdf.addImage(img.src, "JPEG", 0, 0, w, h);
        }

        const blob = pdf.output("blob");
        clearStatus(body);
        addResult(body, blob, "images.pdf");
        showStatus(body, `Created PDF with ${files.length} page(s)!`, "ok");
      } catch(e) { showStatus(body, "Error: " + e.message, "error"); }
    });
  }
});

