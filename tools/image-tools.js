/* Image Format Converter */
registerTool({
  id: "image-convert", name: "Convert Image", icon: "🔄", desc: "Convert between PNG, JPG, WEBP, BMP, GIF, SVG",
  category: "Image Tools", catIcon: "🖼️",
  render(body) {
    let files = [];
    const refresh = () => createFileList(body, files, { onRemove: i => { files.splice(i,1); refresh(); } });

    createDropZone(body, {
      accept: "image/*", multiple: true,
      label: "Drop images here", sublabel: "PNG, JPG, WEBP, BMP, GIF",
      onFiles(f) { files.push(...f); refresh(); }
    });

    const opts = document.createElement("div"); opts.className = "opts-panel";
    opts.innerHTML = `<div class="opt-group"><span class="opt-label">Convert to:</span>
      <select class="opt-select" id="targetFmt">
        <option value="png">PNG</option><option value="jpg">JPG</option>
        <option value="webp">WEBP</option><option value="bmp">BMP</option>
        <option value="gif">GIF</option><option value="svg">SVG</option>
      </select></div>
      <div class="opt-group"><span class="opt-label">Quality:</span>
      <input type="range" min="10" max="100" value="92" id="quality" class="opt-input" style="width:100px" />
      <span id="qualityVal" class="opt-label">92%</span></div>`;
    body.appendChild(opts);

    document.getElementById("quality").addEventListener("input", e => {
      document.getElementById("qualityVal").textContent = e.target.value + "%";
    });

    const row = document.createElement("div"); row.className = "action-row";
    row.innerHTML = `<button class="btn-action" id="btnConvert">🔄 Convert All</button>`;
    body.appendChild(row);

    row.querySelector("#btnConvert").addEventListener("click", async () => {
      if (!files.length) return showStatus(body, "Add images first", "error");
      const target = document.getElementById("targetFmt").value;
      const q = +document.getElementById("quality").value / 100;
      clearResults(body);

      for (let i = 0; i < files.length; i++) {
        showStatus(body, `Converting ${i+1} of ${files.length}…`, "loading");
        try {
          const blob = await convertImg(files[i], target, q);
          addResult(body, blob, `${stem(files[i].name)}.${target}`);
        } catch(e) { showStatus(body, `Error on ${files[i].name}: ${e.message}`, "error"); }
      }
      showStatus(body, `Converted ${files.length} image(s)!`, "ok");
    });
  }
});

async function convertImg(file, ext, quality) {
  const img = await loadImg(file);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");

  if (ext === "svg") {
    ctx.drawImage(img, 0, 0);
    const dataUrl = canvas.toDataURL("image/png");
    const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}">\n<image width="${canvas.width}" height="${canvas.height}" href="${dataUrl}" />\n</svg>`;
    return new Blob([svg], { type: "image/svg+xml" });
  }

  if (["jpg","jpeg","bmp"].includes(ext)) { ctx.fillStyle="#fff"; ctx.fillRect(0,0,canvas.width,canvas.height); }
  ctx.drawImage(img, 0, 0);

  const mimes = { png:"image/png", jpg:"image/jpeg", jpeg:"image/jpeg", webp:"image/webp", bmp:"image/bmp", gif:"image/gif" };
  return new Promise((res, rej) => {
    canvas.toBlob(b => b ? res(b) : rej(new Error("Export failed")), mimes[ext] || "image/png", quality);
  });
}

/* Image Background Removal */
let bgModule = null;
registerTool({
  id: "image-bg-remove", name: "Remove Background", icon: "✨", desc: "AI-powered background removal",
  category: "Image Tools", catIcon: "🖼️",
  render(body) {
    let file = null;
    createDropZone(body, {
      accept: "image/*", multiple: false,
      label: "Drop an image here", sublabel: "AI will remove the background — first use downloads ~40MB model",
      onFiles(f) { file = f[0]; createFileList(body, [file], { onRemove: () => file=null }); }
    });

    const row = document.createElement("div"); row.className = "action-row";
    row.innerHTML = `<button class="btn-action" id="btnRemove">✨ Remove Background</button>`;
    body.appendChild(row);

    row.querySelector("#btnRemove").addEventListener("click", async () => {
      if (!file) return showStatus(body, "Add an image first", "error");
      clearResults(body);
      try {
        if (!bgModule) {
          showStatus(body, "Downloading AI model (first time only, ~40MB)…", "loading");
          bgModule = await import("https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.5/+esm");
        }
        showStatus(body, "Removing background…", "loading");
        const blob = await bgModule.removeBackground(file);
        clearStatus(body);
        addResult(body, blob, `${stem(file.name)}_nobg.png`);
        showStatus(body, "Background removed!", "ok");
      } catch(e) { showStatus(body, "Error: " + e.message, "error"); }
    });
  }
});
