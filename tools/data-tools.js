/* CSV → JSON */
registerTool({
  id: "csv-to-json", name: "CSV to JSON", icon: "📊", desc: "Convert CSV spreadsheet data to JSON",
  category: "Data Tools", catIcon: "📦",
  render(body) {
    let file = null;
    createDropZone(body, {
      accept: ".csv", multiple: false, label: "Drop a CSV file here",
      onFiles(f) { file = f[0]; createFileList(body, [file], { onRemove: () => file=null }); }
    });
    const row = document.createElement("div"); row.className = "action-row";
    row.innerHTML = `<button class="btn-action">📊 Convert to JSON</button>`;
    body.appendChild(row);
    row.querySelector(".btn-action").addEventListener("click", async () => {
      if (!file) return showStatus(body, "Add a CSV file first", "error");
      clearResults(body); showStatus(body, "Converting…", "loading");
      try {
        const text = await file.text();
        const json = csvToJson(text);
        const blob = new Blob([json], { type: "application/json" });
        clearStatus(body); addResult(body, blob, `${stem(file.name)}.json`);
        showStatus(body, "Converted to JSON!", "ok");
      } catch(e) { showStatus(body, "Error: " + e.message, "error"); }
    });
  }
});

/* JSON → CSV */
registerTool({
  id: "json-to-csv", name: "JSON to CSV", icon: "📋", desc: "Convert JSON array to CSV spreadsheet",
  category: "Data Tools", catIcon: "📦",
  render(body) {
    let file = null;
    createDropZone(body, {
      accept: ".json", multiple: false, label: "Drop a JSON file here",
      onFiles(f) { file = f[0]; createFileList(body, [file], { onRemove: () => file=null }); }
    });
    const row = document.createElement("div"); row.className = "action-row";
    row.innerHTML = `<button class="btn-action">📋 Convert to CSV</button>`;
    body.appendChild(row);
    row.querySelector(".btn-action").addEventListener("click", async () => {
      if (!file) return showStatus(body, "Add a JSON file first", "error");
      clearResults(body); showStatus(body, "Converting…", "loading");
      try {
        const text = await file.text();
        const csv = jsonToCsv(text);
        const blob = new Blob([csv], { type: "text/csv" });
        clearStatus(body); addResult(body, blob, `${stem(file.name)}.csv`);
        showStatus(body, "Converted to CSV!", "ok");
      } catch(e) { showStatus(body, "Error: " + e.message, "error"); }
    });
  }
});

/* ── CSV/JSON helpers ── */
function csvToJson(csv) {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) throw new Error("CSV needs a header + at least one data row");
  const headers = parseCsvLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCsvLine(lines[i]);
    const obj = {};
    headers.forEach((h, idx) => obj[h] = vals[idx] || "");
    rows.push(obj);
  }
  return JSON.stringify(rows, null, 2);
}

function jsonToCsv(jsonStr) {
  let data = JSON.parse(jsonStr);
  if (!Array.isArray(data)) data = [data];
  if (!data.length || typeof data[0] !== "object") throw new Error("JSON must be an array of objects");
  const hdrs = []; data.forEach(r => Object.keys(r).forEach(k => { if(!hdrs.includes(k)) hdrs.push(k); }));
  const lines = [hdrs.map(escCsv).join(",")];
  data.forEach(r => lines.push(hdrs.map(h => escCsv(String(r[h]??""))).join(",")));
  return lines.join("\n");
}

function parseCsvLine(line) {
  const r=[]; let c="", q=false;
  for (let i=0;i<line.length;i++) {
    const ch=line[i];
    if (q) { if(ch==='"'&&line[i+1]==='"'){c+='"';i++;} else if(ch==='"') q=false; else c+=ch; }
    else { if(ch==='"') q=true; else if(ch===','){r.push(c.trim());c="";} else c+=ch; }
  }
  r.push(c.trim()); return r;
}

function escCsv(v) { return v.includes(",")||v.includes('"')||v.includes("\n")?`"${v.replace(/"/g,'""')}"`:v; }
