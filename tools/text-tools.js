/* Text Tools (Word counter, Case converter) */
registerTool({
  id: "text-tools", name: "Text Toolkit", icon: "📝", desc: "Word count, character count, and case converter",
  category: "Other Tools", catIcon: "📦",
  render(body) {
    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <div class="opts-panel" style="display:flex; justify-content:space-between; margin-bottom: 1rem;">
        <div style="text-align:center;"><div style="font-size:1.5rem; font-weight:bold; color:var(--accent);" id="wordCount">0</div><div class="opt-label">Words</div></div>
        <div style="text-align:center;"><div style="font-size:1.5rem; font-weight:bold; color:var(--cyan);" id="charCount">0</div><div class="opt-label">Characters</div></div>
        <div style="text-align:center;"><div style="font-size:1.5rem; font-weight:bold; color:var(--emerald);" id="charNoSpace">0</div><div class="opt-label">Chars (no space)</div></div>
        <div style="text-align:center;"><div style="font-size:1.5rem; font-weight:bold; color:var(--rose);" id="lineCount">0</div><div class="opt-label">Lines</div></div>
      </div>
      <textarea id="textInput" class="opt-input" style="width:100%; height:250px; padding:1rem; resize:vertical; font-family:monospace;" placeholder="Type or paste your text here..."></textarea>
      
      <div class="action-row">
        <button class="btn-action" data-action="upper">UPPERCASE</button>
        <button class="btn-action" data-action="lower">lowercase</button>
        <button class="btn-action" data-action="title">Title Case</button>
        <button class="btn-action" data-action="sentence">Sentence case</button>
        <button class="btn-action" data-action="clear" style="background:var(--err);">Clear</button>
        <button class="btn-action" data-action="copy" style="background:var(--ok); color:black;">Copy</button>
      </div>
    `;
    body.appendChild(wrap);

    const input = body.querySelector("#textInput");
    
    function updateCounts() {
      const text = input.value;
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      body.querySelector("#wordCount").textContent = words;
      body.querySelector("#charCount").textContent = text.length;
      body.querySelector("#charNoSpace").textContent = text.replace(/\s/g, '').length;
      body.querySelector("#lineCount").textContent = text ? text.split(/\r\n|\r|\n/).length : 0;
    }

    input.addEventListener("input", updateCounts);

    body.querySelectorAll(".btn-action").forEach(btn => {
      btn.addEventListener("click", () => {
        const text = input.value;
        if (!text && btn.dataset.action !== "clear") return;
        
        switch (btn.dataset.action) {
          case "upper": input.value = text.toUpperCase(); break;
          case "lower": input.value = text.toLowerCase(); break;
          case "title": 
            input.value = text.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.substring(1)).join(' ');
            break;
          case "sentence":
            input.value = text.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, c => c.toUpperCase());
            break;
          case "clear": input.value = ""; break;
          case "copy":
            navigator.clipboard.writeText(text);
            const oldTxt = btn.textContent;
            btn.textContent = "Copied!";
            setTimeout(() => btn.textContent = oldTxt, 2000);
            break;
        }
        updateCounts();
      });
    });
  }
});
