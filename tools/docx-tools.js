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

// Helper to dynamically load scripts if not present
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}
