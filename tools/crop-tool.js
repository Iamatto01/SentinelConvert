/* ═══════════════════════════════════════════════════════
   Image Crop Tool — Crop images by selection
   ═══════════════════════════════════════════════════════ */
registerTool({
  id: "image-crop", name: "Crop Image", icon: "✂️", desc: "Crop images by dragging a selection area",
  category: "Image Tools", catIcon: "🖼️",
  render(body) {
    let file = null;
    let originalImg = null;
    let cropRect = { x: 0, y: 0, w: 0, h: 0 };
    let isDragging = false;
    let startX = 0, startY = 0;

    createDropZone(body, {
      accept: "image/*", multiple: false,
      label: "Drop an image here to crop", sublabel: "Draw a rectangle on the image to select the crop area",
      onFiles: async (f) => {
        file = f[0];
        createFileList(body, [file], { onRemove: () => { file = null; originalImg = null; resetCanvas(); } });
        try {
          originalImg = await loadImg(file);
          initCanvas();
        } catch(e) { showStatus(body, "Error loading image: " + e.message, "error"); }
      }
    });

    // Canvas container
    const cropContainer = document.createElement("div");
    cropContainer.className = "crop-container";
    cropContainer.style.display = "none";
    const canvas = document.createElement("canvas");
    canvas.className = "crop-canvas";
    cropContainer.appendChild(canvas);
    body.appendChild(cropContainer);

    // Preset options
    const opts = document.createElement("div"); opts.className = "opts-panel";
    opts.innerHTML = `
      <div class="opt-group"><span class="opt-label">Preset:</span>
        <select class="opt-select" id="cropPreset">
          <option value="free">Free Selection</option>
          <option value="1:1">1:1 (Square)</option>
          <option value="4:3">4:3</option>
          <option value="16:9">16:9</option>
          <option value="3:2">3:2</option>
        </select>
      </div>
      <div class="opt-group"><span class="opt-label">Output:</span>
        <select class="opt-select" id="cropFormat">
          <option value="png">PNG</option>
          <option value="jpeg">JPG</option>
          <option value="webp">WEBP</option>
        </select>
      </div>
    `;
    body.appendChild(opts);

    const row = document.createElement("div"); row.className = "action-row";
    row.innerHTML = `<button class="btn-action" id="btnCrop">✂️ Crop Image</button>
      <button class="btn-action" id="btnResetCrop" style="background:var(--surface);border:1px solid var(--border);color:var(--text);">↺ Reset Selection</button>`;
    body.appendChild(row);

    const ctx = canvas.getContext("2d");

    function resetCanvas() {
      cropContainer.style.display = "none";
      cropRect = { x: 0, y: 0, w: 0, h: 0 };
    }

    function initCanvas() {
      if (!originalImg) return;
      cropContainer.style.display = "flex";

      // Scale image to fit container (max 800px wide)
      const maxW = 780;
      const scale = originalImg.naturalWidth > maxW ? maxW / originalImg.naturalWidth : 1;
      canvas.width = Math.round(originalImg.naturalWidth * scale);
      canvas.height = Math.round(originalImg.naturalHeight * scale);
      canvas._scale = scale;

      drawImage();
      showStatus(body, `Image loaded: ${originalImg.naturalWidth}x${originalImg.naturalHeight}px — Click and drag to select crop area`, "ok");
    }

    function drawImage() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(originalImg, 0, 0, canvas.width, canvas.height);

      // Draw crop overlay
      if (cropRect.w > 0 && cropRect.h > 0) {
        // Darken outside selection
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Clear the selected area to show original
        ctx.clearRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
        ctx.drawImage(originalImg,
          cropRect.x / canvas._scale, cropRect.y / canvas._scale,
          cropRect.w / canvas._scale, cropRect.h / canvas._scale,
          cropRect.x, cropRect.y, cropRect.w, cropRect.h
        );

        // Draw border around selection
        ctx.strokeStyle = "#6c63ff";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
        ctx.setLineDash([]);

        // Draw corner handles
        const handles = [
          [cropRect.x, cropRect.y],
          [cropRect.x + cropRect.w, cropRect.y],
          [cropRect.x, cropRect.y + cropRect.h],
          [cropRect.x + cropRect.w, cropRect.y + cropRect.h],
        ];
        handles.forEach(([hx, hy]) => {
          ctx.fillStyle = "#6c63ff";
          ctx.fillRect(hx - 4, hy - 4, 8, 8);
        });

        // Show dimensions
        const realW = Math.round(cropRect.w / canvas._scale);
        const realH = Math.round(cropRect.h / canvas._scale);
        ctx.fillStyle = "#6c63ff";
        ctx.fillRect(cropRect.x, cropRect.y - 22, 90, 20);
        ctx.fillStyle = "#fff";
        ctx.font = "12px Inter, sans-serif";
        ctx.fillText(`${realW}×${realH}`, cropRect.x + 6, cropRect.y - 7);
      }
    }

    function getCanvasPos(e) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }

    canvas.addEventListener("mousedown", (e) => {
      if (!originalImg) return;
      const pos = getCanvasPos(e);
      isDragging = true;
      startX = pos.x;
      startY = pos.y;
      cropRect = { x: pos.x, y: pos.y, w: 0, h: 0 };
    });

    canvas.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      const pos = getCanvasPos(e);
      let w = pos.x - startX;
      let h = pos.y - startY;

      const preset = document.getElementById("cropPreset").value;
      if (preset !== "free") {
        const [rw, rh] = preset.split(":").map(Number);
        const aspect = rw / rh;
        if (Math.abs(w) / aspect > Math.abs(h)) {
          h = Math.sign(h || 1) * Math.abs(w) / aspect;
        } else {
          w = Math.sign(w || 1) * Math.abs(h) * aspect;
        }
      }

      cropRect = {
        x: w >= 0 ? startX : startX + w,
        y: h >= 0 ? startY : startY + h,
        w: Math.abs(w),
        h: Math.abs(h)
      };

      // Clamp to canvas bounds
      cropRect.x = Math.max(0, cropRect.x);
      cropRect.y = Math.max(0, cropRect.y);
      if (cropRect.x + cropRect.w > canvas.width) cropRect.w = canvas.width - cropRect.x;
      if (cropRect.y + cropRect.h > canvas.height) cropRect.h = canvas.height - cropRect.y;

      drawImage();
    });

    canvas.addEventListener("mouseup", () => { isDragging = false; });
    canvas.addEventListener("mouseleave", () => { isDragging = false; });

    body.querySelector("#btnResetCrop").addEventListener("click", () => {
      cropRect = { x: 0, y: 0, w: 0, h: 0 };
      if (originalImg) drawImage();
    });

    body.querySelector("#btnCrop").addEventListener("click", async () => {
      if (!originalImg) return showStatus(body, "Add an image first", "error");
      if (cropRect.w < 5 || cropRect.h < 5) return showStatus(body, "Draw a selection area on the image first", "error");

      clearResults(body);
      showStatus(body, "Cropping…", "loading");

      try {
        const scale = canvas._scale;
        const sx = Math.round(cropRect.x / scale);
        const sy = Math.round(cropRect.y / scale);
        const sw = Math.round(cropRect.w / scale);
        const sh = Math.round(cropRect.h / scale);

        const outCanvas = document.createElement("canvas");
        outCanvas.width = sw;
        outCanvas.height = sh;
        const outCtx = outCanvas.getContext("2d");
        outCtx.drawImage(originalImg, sx, sy, sw, sh, 0, 0, sw, sh);

        const format = document.getElementById("cropFormat").value;
        const mime = `image/${format}`;
        const blob = await new Promise(res => outCanvas.toBlob(res, mime, 0.92));

        clearStatus(body);
        addResult(body, blob, `${stem(file.name)}_cropped.${format === "jpeg" ? "jpg" : format}`);
        showStatus(body, `Cropped to ${sw}×${sh} px!`, "ok");
      } catch(e) { showStatus(body, "Error: " + e.message, "error"); }
    });
  }
});
