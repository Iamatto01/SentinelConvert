/* Excel to CSV Tool */
registerTool({
  id: "excel-to-csv", name: "Excel to CSV", icon: "📊", desc: "Convert Excel (.xlsx, .xls) to CSV",
  category: "Document Tools", catIcon: "📝",
  render(body) {
    let file = null;
    createDropZone(body, {
      accept: ".xlsx, .xls", multiple: false,
      label: "Drop an Excel file here", sublabel: "Converts the first worksheet to CSV",
      onFiles(f) { file = f[0]; createFileList(body, [file], { onRemove: () => file=null }); }
    });

    const row = document.createElement("div"); row.className = "action-row";
    row.innerHTML = `<button class="btn-action" id="btnConvertExcel">📊 Convert to CSV</button>`;
    body.appendChild(row);

    row.querySelector("#btnConvertExcel").addEventListener("click", async () => {
      if (!file) return showStatus(body, "Add an Excel file first", "error");
      clearResults(body); showStatus(body, "Converting Excel…", "loading");

      try {
        if (typeof XLSX === "undefined") {
            await loadScript("https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js");
        }

        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const worksheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[worksheetName];
        
        const csvText = XLSX.utils.sheet_to_csv(worksheet);
        const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });

        clearStatus(body);
        addResult(body, blob, `${stem(file.name)}.csv`);
        showStatus(body, "Converted Excel to CSV successfully!", "ok");

      } catch (e) {
        showStatus(body, "Error: " + e.message, "error");
      }
    });
  }
});

/* CSV to Excel Tool */
registerTool({
  id: "csv-to-excel", name: "CSV to Excel", icon: "📈", desc: "Convert CSV to Excel (.xlsx)",
  category: "Document Tools", catIcon: "📝",
  render(body) {
    let file = null;
    createDropZone(body, {
      accept: ".csv", multiple: false,
      label: "Drop a CSV file here", sublabel: "Converts to a standard .xlsx file",
      onFiles(f) { file = f[0]; createFileList(body, [file], { onRemove: () => file=null }); }
    });

    const row = document.createElement("div"); row.className = "action-row";
    row.innerHTML = `<button class="btn-action" id="btnConvertCsv">📈 Convert to Excel</button>`;
    body.appendChild(row);

    row.querySelector("#btnConvertCsv").addEventListener("click", async () => {
      if (!file) return showStatus(body, "Add a CSV file first", "error");
      clearResults(body); showStatus(body, "Converting CSV…", "loading");

      try {
        if (typeof XLSX === "undefined") {
            await loadScript("https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js");
        }

        const text = await file.text();
        const workbook = XLSX.read(text, { type: "string" });
        const outArrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([outArrayBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

        clearStatus(body);
        addResult(body, blob, `${stem(file.name)}.xlsx`);
        showStatus(body, "Converted CSV to Excel successfully!", "ok");

      } catch (e) {
        showStatus(body, "Error: " + e.message, "error");
      }
    });
  }
});
