/* DOCX → PDF Tool */
registerTool({
  id: "docx-to-pdf", name: "DOCX to PDF", icon: "📑", desc: "Convert Word documents to PDF",
  category: "Document Tools", catIcon: "📝",
  render(body) {
    let file = null;
    createDropZone(body, {
      accept: ".docx", multiple: false,
      label: "Drop a DOCX file here", sublabel: "Converts text and basic formatting to PDF",
      onFiles(f) { file = f[0]; createFileList(body, [file], { onRemove: () => file=null }); }
    });

    const row = document.createElement("div"); row.className = "action-row";
    row.innerHTML = `<button class="btn-action" id="btnConvertDocx">📑 Convert to PDF</button>`;
    body.appendChild(row);

    row.querySelector("#btnConvertDocx").addEventListener("click", async () => {
      if (!file) return showStatus(body, "Add a DOCX file first", "error");
      clearResults(body); showStatus(body, "Converting DOCX…", "loading");

      try {
        // We need mammoth.js and html2pdf.js loaded for this
        if (typeof mammoth === "undefined") {
            await loadScript("https://cdn.jsdelivr.net/npm/mammoth@1.4.22/mammoth.browser.min.js");
        }
        if (typeof html2pdf === "undefined") {
            await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js");
        }

        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
        const html = result.value; // The generated HTML

        // Create a hidden container for the HTML
        const container = document.createElement('div');
        container.innerHTML = html;
        container.style.padding = '20px';
        container.style.width = '800px'; // Force a width for rendering
        container.style.background = 'white';
        container.style.color = 'black';
        container.style.fontFamily = 'Arial, sans-serif';
        // Need to attach to DOM temporarily for html2pdf to measure correctly, but keep it hidden
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        document.body.appendChild(container);

        const opt = {
          margin:       1,
          filename:     `${stem(file.name)}.pdf`,
          image:        { type: 'jpeg', quality: 0.98 },
          html2canvas:  { scale: 2 },
          jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        const pdfBlob = await html2pdf().set(opt).from(container).outputPdf('blob');
        document.body.removeChild(container);

        clearStatus(body);
        addResult(body, pdfBlob, `${stem(file.name)}.pdf`);
        showStatus(body, "Converted DOCX to PDF successfully!", "ok");

      } catch (e) {
        showStatus(body, "Error: " + e.message, "error");
      }
    });
  }
});
/* PDF → DOCX Tool */
registerTool({
  id: "pdf-to-docx", name: "PDF to DOCX", icon: "📝", desc: "Extract text from PDF to a Word document",
  category: "Document Tools", catIcon: "📝",
  render(body) {
    let file = null;
    createDropZone(body, {
      accept: ".pdf", multiple: false,
      label: "Drop a PDF file here", sublabel: "Extracts text to a DOCX file (Images & Layouts not supported)",
      onFiles(f) { file = f[0]; createFileList(body, [file], { onRemove: () => file=null }); }
    });

    const row = document.createElement("div"); row.className = "action-row";
    row.innerHTML = `<button class="btn-action" id="btnConvertPdfToDocx">📝 Extract Text to DOCX</button>`;
    body.appendChild(row);

    row.querySelector("#btnConvertPdfToDocx").addEventListener("click", async () => {
      if (!file) return showStatus(body, "Add a PDF file first", "error");
      clearResults(body); showStatus(body, "Extracting text from PDF…", "loading");

      try {
        // Load docx library if not present
        if (typeof window.docx === "undefined") {
            showStatus(body, "Loading DOCX library…", "loading");
            await loadScript("https://unpkg.com/docx@8.2.3/build/index.js");
            // Wait a bit for the library to initialize
            await new Promise(r => setTimeout(r, 100));
        }

        const docxLib = window.docx;
        if (!docxLib) throw new Error("DOCX library failed to load. Please try again.");

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const totalPages = pdf.numPages;
        
        const docxParagraphs = [];

        for (let i = 1; i <= totalPages; i++) {
          showStatus(body, `Reading page ${i} of ${totalPages}…`, "loading");
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          
          // Simple heuristic: group text by checking Y coordinates
          let currentY = null;
          let currentLine = [];
          
          textContent.items.forEach(item => {
             const y = Math.round(item.transform[5]);
             if (currentY === null) currentY = y;
             
             if (Math.abs(y - currentY) > 5) {
                 if (currentLine.length > 0) {
                    docxParagraphs.push(new docxLib.Paragraph({
                       children: [new docxLib.TextRun(currentLine.join(" "))]
                    }));
                 }
                 currentLine = [];
                 currentY = y;
             }
             currentLine.push(item.str);
          });
          
          if (currentLine.length > 0) {
             docxParagraphs.push(new docxLib.Paragraph({
                children: [new docxLib.TextRun(currentLine.join(" "))]
             }));
          }
          
          if (i < totalPages) {
             docxParagraphs.push(new docxLib.Paragraph({ children: [new docxLib.TextRun("")] }));
             docxParagraphs.push(new docxLib.Paragraph({ children: [new docxLib.TextRun("--- Page Break ---")] }));
          }
        }

        showStatus(body, "Creating DOCX…", "loading");

        const doc = new docxLib.Document({
          sections: [{
            properties: {},
            children: docxParagraphs
          }]
        });

        let blob;
        if (docxLib.Packer && typeof docxLib.Packer.toBlob === "function") {
           blob = await docxLib.Packer.toBlob(doc);
        } else if (docxLib.Packer && typeof docxLib.Packer.toBuffer === "function") {
           const buffer = await docxLib.Packer.toBuffer(doc);
           blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
        } else {
           throw new Error("DOCX Packer API not available");
        }

        clearStatus(body);
        addResult(body, blob, `${stem(file.name)}.docx`);
        showStatus(body, "Text extracted to DOCX successfully!", "ok");

      } catch (e) {
        showStatus(body, "Error: " + e.message + " — Try again or use a simpler PDF.", "error");
      }
    });
  }
});
