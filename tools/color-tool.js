/* ═══════════════════════════════════════════════════════
   Color Picker / Converter Tool
   HEX ↔ RGB ↔ HSL conversion with live preview
   ═══════════════════════════════════════════════════════ */
registerTool({
  id: "color-picker", name: "Color Picker", icon: "🎨", desc: "Pick colors and convert between HEX, RGB, and HSL",
  category: "Text Tools", catIcon: "✏️",
  render(body) {
    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <div class="color-preview-bar">
        <input type="color" id="colorPickerInput" value="#6c63ff" style="width:80px;height:80px;border:none;cursor:pointer;background:none;padding:0;" />
        <div class="color-values">
          <div class="color-value-row">
            <span class="color-value-label">HEX</span>
            <input type="text" class="color-value-input" id="colorHex" value="#6C63FF" />
            <button class="btn-action" style="padding:0.3rem 0.6rem;font-size:0.75rem;" data-copy="colorHex">📋</button>
          </div>
          <div class="color-value-row">
            <span class="color-value-label">RGB</span>
            <input type="text" class="color-value-input" id="colorRgb" value="rgb(108, 99, 255)" />
            <button class="btn-action" style="padding:0.3rem 0.6rem;font-size:0.75rem;" data-copy="colorRgb">📋</button>
          </div>
          <div class="color-value-row">
            <span class="color-value-label">HSL</span>
            <input type="text" class="color-value-input" id="colorHsl" value="hsl(243, 100%, 69%)" />
            <button class="btn-action" style="padding:0.3rem 0.6rem;font-size:0.75rem;" data-copy="colorHsl">📋</button>
          </div>
          <div class="color-value-row">
            <span class="color-value-label">RGBA</span>
            <input type="text" class="color-value-input" id="colorRgba" value="rgba(108, 99, 255, 1)" />
            <button class="btn-action" style="padding:0.3rem 0.6rem;font-size:0.75rem;" data-copy="colorRgba">📋</button>
          </div>
        </div>
      </div>

      <div class="opts-panel" style="margin-top:1rem;">
        <div class="opt-group" style="flex:1;">
          <span class="opt-label">R:</span>
          <input type="range" min="0" max="255" value="108" id="sliderR" class="opt-input" style="width:100%;accent-color:#f43f5e;" />
          <span class="opt-label" id="valR" style="width:30px;text-align:right;">108</span>
        </div>
        <div class="opt-group" style="flex:1;">
          <span class="opt-label">G:</span>
          <input type="range" min="0" max="255" value="99" id="sliderG" class="opt-input" style="width:100%;accent-color:#10b981;" />
          <span class="opt-label" id="valG" style="width:30px;text-align:right;">99</span>
        </div>
        <div class="opt-group" style="flex:1;">
          <span class="opt-label">B:</span>
          <input type="range" min="0" max="255" value="255" id="sliderB" class="opt-input" style="width:100%;accent-color:#6c63ff;" />
          <span class="opt-label" id="valB" style="width:30px;text-align:right;">255</span>
        </div>
      </div>

      <div class="action-row" style="margin-top:1rem;">
        <button class="btn-action" id="btnRandomColor">🎲 Random Color</button>
        <button class="btn-action" id="btnCopyAll" style="background:var(--emerald);">📋 Copy All</button>
      </div>
    `;
    body.appendChild(wrap);

    const pickerInput = body.querySelector("#colorPickerInput");
    const hexInput = body.querySelector("#colorHex");
    const rgbInput = body.querySelector("#colorRgb");
    const hslInput = body.querySelector("#colorHsl");
    const rgbaInput = body.querySelector("#colorRgba");
    const sliderR = body.querySelector("#sliderR");
    const sliderG = body.querySelector("#sliderG");
    const sliderB = body.querySelector("#sliderB");

    function hexToRgb(hex) {
      hex = hex.replace("#", "");
      if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
      const r = parseInt(hex.substring(0,2), 16);
      const g = parseInt(hex.substring(2,4), 16);
      const b = parseInt(hex.substring(4,6), 16);
      return { r, g, b };
    }

    function rgbToHex(r, g, b) {
      return "#" + [r, g, b].map(v => v.toString(16).padStart(2, "0")).join("").toUpperCase();
    }

    function rgbToHsl(r, g, b) {
      r /= 255; g /= 255; b /= 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h, s, l = (max + min) / 2;

      if (max === min) {
        h = s = 0;
      } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }
      return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100)
      };
    }

    function updateFromRgb(r, g, b) {
      const hex = rgbToHex(r, g, b);
      const hsl = rgbToHsl(r, g, b);

      pickerInput.value = hex.toLowerCase();
      hexInput.value = hex;
      rgbInput.value = `rgb(${r}, ${g}, ${b})`;
      hslInput.value = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
      rgbaInput.value = `rgba(${r}, ${g}, ${b}, 1)`;

      sliderR.value = r; body.querySelector("#valR").textContent = r;
      sliderG.value = g; body.querySelector("#valG").textContent = g;
      sliderB.value = b; body.querySelector("#valB").textContent = b;
    }

    // Color picker change
    pickerInput.addEventListener("input", (e) => {
      const { r, g, b } = hexToRgb(e.target.value);
      updateFromRgb(r, g, b);
    });

    // HEX input change
    hexInput.addEventListener("change", () => {
      const val = hexInput.value.trim();
      if (/^#?[0-9a-fA-F]{3,6}$/.test(val)) {
        const { r, g, b } = hexToRgb(val);
        updateFromRgb(r, g, b);
      }
    });

    // RGB input change
    rgbInput.addEventListener("change", () => {
      const match = rgbInput.value.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
      if (match) {
        updateFromRgb(+match[1], +match[2], +match[3]);
      }
    });

    // Slider changes
    [sliderR, sliderG, sliderB].forEach(slider => {
      slider.addEventListener("input", () => {
        updateFromRgb(+sliderR.value, +sliderG.value, +sliderB.value);
      });
    });

    // Copy buttons
    body.querySelectorAll("[data-copy]").forEach(btn => {
      btn.addEventListener("click", () => {
        const target = body.querySelector("#" + btn.dataset.copy);
        navigator.clipboard.writeText(target.value).then(() => {
          const old = btn.textContent;
          btn.textContent = "✓";
          setTimeout(() => btn.textContent = old, 1500);
        });
      });
    });

    // Random color
    body.querySelector("#btnRandomColor").addEventListener("click", () => {
      const r = Math.floor(Math.random() * 256);
      const g = Math.floor(Math.random() * 256);
      const b = Math.floor(Math.random() * 256);
      updateFromRgb(r, g, b);
      showStatus(body, `Random color: ${rgbToHex(r, g, b)}`, "ok");
    });

    // Copy all
    body.querySelector("#btnCopyAll").addEventListener("click", () => {
      const all = `HEX: ${hexInput.value}\nRGB: ${rgbInput.value}\nHSL: ${hslInput.value}\nRGBA: ${rgbaInput.value}`;
      navigator.clipboard.writeText(all).then(() => {
        showStatus(body, "All color values copied! 📋", "ok");
      });
    });

    // Initialize with default color
    updateFromRgb(108, 99, 255);
  }
});
