/* Organize PDF Tool */
registerTool({
  id: "pdf-organize", name: "Organize PDF", icon: "📑", desc: "Sort, rotate, delete, and merge PDF pages visually",
  category: "PDF Tools", catIcon: "📄",
  render(body) {
    let pdfFiles = []; // Store raw File objects
    let loadedPdfs = []; // Store pdf-lib PDFDocument instances
    let pageState = []; // [{ pdfIndex, pageIndex, rotation, dataUrl }]

    // Main layout
    body.innerHTML = `
      <div id="orgDropZone"></div>
      <div id="orgWorkspace" class="hidden">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1rem;">
          <div><span id="pageCountBadge" class="badge">0 Pages</span></div>
          <div>
            <button class="btn-back" id="btnAddMore" style="margin-right: 0.5rem;">+ Add More Files</button>
            <button class="btn-action" id="btnSavePdf">💾 Save PDF</button>
          </div>
        </div>
        <div id="orgGrid" class="organize-grid"></div>
        <div id="orgStatus"></div>
      </div>
    `;

    const dropZoneContainer = body.querySelector("#orgDropZone");
    const workspace = body.querySelector("#orgWorkspace");
    const grid = body.querySelector("#orgGrid");
    const btnAddMore = body.querySelector("#btnAddMore");
    const btnSavePdf = body.querySelector("#btnSavePdf");
    const statusContainer = body.querySelector("#orgStatus");

    // Initialize SortableJS
    let sortable = null;
    function initSortable() {
      if (sortable) sortable.destroy();
      sortable = new Sortable(grid, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        onEnd: () => {
          // Update pageState based on new DOM order
          const newOrder = [];
          grid.querySelectorAll('.page-card').forEach(card => {
            const id = parseInt(card.dataset.id);
            newOrder.push(pageState[id]);
          });
          pageState = newOrder;
          renderGrid(); // re-render to update page numbers and data-ids
        }
      });
    }

    async function handleFiles(files) {
      if (!files || files.length === 0) return;
      
      dropZoneContainer.classList.add("hidden");
      workspace.classList.remove("hidden");
      showStatus(statusContainer, "Loading PDFs and rendering thumbnails...", "loading");
      
      try {
        for (let file of files) {
          const pdfIndex = pdfFiles.length;
          pdfFiles.push(file);

          const arrayBuffer = await file.arrayBuffer();
          // Load in pdf-lib for later saving
          const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
          loadedPdfs.push(pdfDoc);

          // Load in pdf.js for thumbnail rendering
          const pdfjsDoc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
          const totalPages = pdfjsDoc.numPages;

          for (let i = 1; i <= totalPages; i++) {
            const page = await pdfjsDoc.getPage(i);
            const viewport = page.getViewport({ scale: 0.5 }); // smaller scale for thumbnail
            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext("2d");
            
            await page.render({ canvasContext: ctx, viewport: viewport }).promise;
            const dataUrl = canvas.toDataURL("image/jpeg", 0.7);

            pageState.push({
              pdfIndex: pdfIndex,
              pageIndex: i - 1, // 0-indexed for pdf-lib
              rotation: 0,
              dataUrl: dataUrl
            });
          }
        }
        
        clearStatus(statusContainer);
        renderGrid();
      } catch (e) {
        showStatus(statusContainer, "Error loading PDF: " + e.message, "error");
      }
    }

    createDropZone(dropZoneContainer, {
      accept: ".pdf", multiple: true,
      label: "Drop PDF files here to organize", sublabel: "You can drag and drop pages later",
      onFiles: handleFiles
    });

    btnAddMore.addEventListener("click", () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".pdf";
      input.multiple = true;
      input.onchange = () => handleFiles(Array.from(input.files));
      input.click();
    });

    function renderGrid() {
      grid.innerHTML = "";
      body.querySelector("#pageCountBadge").textContent = `${pageState.length} Pages`;

      pageState.forEach((page, index) => {
        const card = document.createElement("div");
        card.className = "page-card";
        card.dataset.id = index;
        
        card.innerHTML = `
          <div class="page-controls">
            <button class="btn-page-ctrl rotate" title="Rotate" data-idx="${index}">↻</button>
            <button class="btn-page-ctrl del" title="Delete" data-idx="${index}">✕</button>
          </div>
          <img src="${page.dataUrl}" class="page-thumb" style="transform: rotate(${page.rotation}deg);" />
          <div class="page-num">${index + 1}</div>
        `;
        grid.appendChild(card);
      });

      // Bind events
      grid.querySelectorAll(".btn-page-ctrl.rotate").forEach(btn => {
        btn.addEventListener("click", (e) => {
          const idx = parseInt(btn.dataset.idx);
          pageState[idx].rotation = (pageState[idx].rotation + 90) % 360;
          renderGrid();
        });
      });

      grid.querySelectorAll(".btn-page-ctrl.del").forEach(btn => {
        btn.addEventListener("click", (e) => {
          const idx = parseInt(btn.dataset.idx);
          pageState.splice(idx, 1);
          renderGrid();
        });
      });

      initSortable();
    }

    btnSavePdf.addEventListener("click", async () => {
      if (pageState.length === 0) return showStatus(statusContainer, "No pages to save", "error");
      
      clearResults(workspace);
      showStatus(statusContainer, "Generating final PDF...", "loading");

      try {
        const { PDFDocument, degrees } = PDFLib;
        const newPdf = await PDFDocument.create();

        for (let i = 0; i < pageState.length; i++) {
          const state = pageState[i];
          const sourcePdf = loadedPdfs[state.pdfIndex];
          
          const [copiedPage] = await newPdf.copyPages(sourcePdf, [state.pageIndex]);
          
          if (state.rotation !== 0) {
             const currentRotation = copiedPage.getRotation().angle;
             copiedPage.setRotation(degrees(currentRotation + state.rotation));
          }
          
          newPdf.addPage(copiedPage);
        }

        const bytes = await newPdf.save();
        const blob = new Blob([bytes], { type: "application/pdf" });
        
        clearStatus(statusContainer);
        addResult(workspace, blob, "organized.pdf");
        showStatus(statusContainer, "PDF created successfully!", "ok");

      } catch (e) {
        showStatus(statusContainer, "Error saving PDF: " + e.message, "error");
      }
    });
  }
});
