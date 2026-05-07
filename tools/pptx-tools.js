/* ═══════════════════════════════════════════════════════
   PPTX Conversion Tools — PowerPoint Document Conversion
   PPTX ↔ PDF Conversion
   ═══════════════════════════════════════════════════════ */

/* PPTX → PDF Tool */
registerTool({
  id: "pptx-to-pdf", name: "PPTX to PDF", icon: "📊", desc: "Convert PowerPoint presentations to PDF",
  category: "Document Tools", catIcon: "📝",
  render(body) {
    let file = null;
    createDropZone(body, {
      accept: ".pptx", multiple: false,
      label: "Drop a PPTX file here", sublabel: "Converts all slides to a PDF document",
      onFiles(f) { file = f[0]; createFileList(body, [file], { onRemove: () => file=null }); }
    });

    const row = document.createElement("div"); row.className = "action-row";
    row.innerHTML = `<button class="btn-action" id="btnConvertPptx">📊 Convert to PDF</button>`;
    body.appendChild(row);

    row.querySelector("#btnConvertPptx").addEventListener("click", async () => {
      if (!file) return showStatus(body, "Add a PPTX file first", "error");
      clearResults(body); showStatus(body, "Loading PPTX…", "loading");

      try {
        // Load pptxjs if not present
        if (typeof PptxParser === "undefined") {
            showStatus(body, "Loading PowerPoint parser…", "loading");
            await loadPptxLibrary();
        }

        const arrayBuffer = await file.arrayBuffer();
        
        // Use JSZip to parse PPTX (it's a ZIP file)
        if (typeof JSZip === "undefined") {
            throw new Error("JSZip not loaded");
        }

        const zip = await JSZip.loadAsync(arrayBuffer);
        const slides = [];

        // Get slide count from presentation.xml
        const presentationXml = await zip.file("ppt/presentation.xml").async("string");
        const slideCount = (presentationXml.match(/slide/g) || []).length;

        // Extract text from slides
        for (let i = 1; i <= slideCount; i++) {
          showStatus(body, `Processing slide ${i} of ${slideCount}…`, "loading");
          const slideFile = `ppt/slides/slide${i}.xml`;
          const slideXml = await zip.file(slideFile).async("string");
          
          // Extract text from the slide XML
          const slideText = extractTextFromSlideXml(slideXml);
          slides.push({ index: i, text: slideText });
        }

        showStatus(body, "Creating PDF…", "loading");

        // Create PDF from slides
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });

        let firstPage = true;
        slides.forEach((slide, idx) => {
          if (!firstPage) pdf.addPage();
          firstPage = false;

          pdf.setFontSize(16);
          pdf.text(`Slide ${slide.index}`, 15, 15);
          
          pdf.setFontSize(11);
          const lines = pdf.splitTextToSize(slide.text || "(No text)", 180);
          pdf.text(lines, 15, 25);

          // Add page number
          pdf.setFontSize(9);
          pdf.text(`Page ${idx + 1}`, 190, 285);
        });

        const pdfBlob = pdf.output("blob");

        clearStatus(body);
        addResult(body, pdfBlob, `${stem(file.name)}.pdf`);
        showStatus(body, `Converted ${slideCount} slides to PDF!`, "ok");

      } catch (e) {
        showStatus(body, "Error: " + e.message, "error");
      }
    });
  }
});

/* PDF → PPTX Tool */
registerTool({
  id: "pdf-to-pptx", name: "PDF to PPTX", icon: "📄", desc: "Convert PDF pages to PowerPoint presentation",
  category: "Document Tools", catIcon: "📝",
  render(body) {
    let file = null;
    createDropZone(body, {
      accept: ".pdf", multiple: false,
      label: "Drop a PDF file here", sublabel: "Each page becomes a slide in PPTX (images + text)",
      onFiles(f) { file = f[0]; createFileList(body, [file], { onRemove: () => file=null }); }
    });

    const row = document.createElement("div"); row.className = "action-row";
    row.innerHTML = `<button class="btn-action" id="btnConvertPdfPptx">📄 Convert to PPTX</button>`;
    body.appendChild(row);

    row.querySelector("#btnConvertPdfPptx").addEventListener("click", async () => {
      if (!file) return showStatus(body, "Add a PDF file first", "error");
      clearResults(body); showStatus(body, "Loading PDF…", "loading");

      try {
        // Load PptxGenJS if not present
        if (typeof PptxGenJS === "undefined") {
            showStatus(body, "Loading presentation generator…", "loading");
            await loadPptxLibrary();
        }

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const totalPages = pdf.numPages;

        showStatus(body, "Creating presentation…", "loading");

        // Create presentation
        const pres = new PptxGenJS();
        pres.defineLayout({ name: 'LAYOUT1', master: 'MASTER1' });

        // Define master slide
        pres.defineMaster({
          name: 'MASTER1',
          background: { color: 'FFFFFF' },
          objects: [
            { placeholder: { options: { name: 'body', type: 'body', x: 0.5, y: 0.5, w: 9.0, h: 6.5 }, text: '' } }
          ]
        });

        // Process each PDF page
        for (let i = 1; i <= totalPages; i++) {
          showStatus(body, `Converting page ${i} of ${totalPages}…`, "loading");

          const page = await pdf.getPage(i);
          const scale = 2;
          const viewport = page.getViewport({ scale });

          // Render page to canvas
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const context = canvas.getContext("2d");

          await page.render({ canvasContext: context, viewport }).promise;
          const imageData = canvas.toDataURL("image/png");

          // Create slide with page image
          const slide = pres.addSlide();
          slide.background = { color: "FFFFFF" };
          
          // Add image to slide
          slide.addImage({
            data: imageData,
            x: 0.25,
            y: 0.25,
            w: 9.5,
            h: 7.0,
            sizing: { type: 'contain', w: 9.5, h: 7.0 }
          });

          // Add page number
          slide.addText(`Page ${i}`, {
            x: 0.25,
            y: 6.8,
            w: 9.5,
            h: 0.3,
            fontSize: 10,
            color: "666666",
            align: "right"
          });
        }

        showStatus(body, "Saving PPTX…", "loading");
        const pptxBlob = await pres.toBlob();

        clearStatus(body);
        addResult(body, pptxBlob, `${stem(file.name)}.pptx`);
        showStatus(body, `Converted ${totalPages} PDF pages to PPTX!`, "ok");

      } catch (e) {
        showStatus(body, "Error: " + e.message, "error");
      }
    });
  }
});

/* ── Helper Functions ── */

function extractTextFromSlideXml(xml) {
  // Simple XML parsing to extract text
  const textMatches = xml.match(/<a:t>([^<]*)<\/a:t>/g) || [];
  return textMatches
    .map(match => match.replace(/<\/?a:t>/g, ''))
    .join(' ');
}

async function loadPptxLibrary() {
  if (typeof PptxGenJS !== "undefined") return Promise.resolve();

  const candidates = [
    "https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.min.js",
    "https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js",
    "https://unpkg.com/pptxgenjs@3.12.0/dist/pptxgen.min.js",
    "https://unpkg.com/pptxgenjs@3.12.0/dist/pptxgen.bundle.js"
  ];

  let lastError = null;
  for (const src of candidates) {
    try {
      await loadLibrary(src, "PptxGenJS");
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(`Failed to load PptxGenJS: ${lastError ? lastError.message : "no CDN candidates succeeded"}`);
}

async function loadLibrary(src, globalName) {
  if (window[globalName]) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => {
      setTimeout(() => {
        if (!window[globalName]) reject(new Error(`${globalName} not available after loading`));
        else resolve();
      }, 100);
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}
