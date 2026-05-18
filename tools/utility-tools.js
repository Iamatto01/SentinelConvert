/* ═══════════════════════════════════════════════════════
   Utility Tools — JSON, QR Codes, Base64, Unit Converter
   ═══════════════════════════════════════════════════════ */

/* JSON Formatter/Beautifier Tool */
registerTool({
  id: "json-formatter", name: "JSON Formatter", icon: "{}",  desc: "Format, validate, and beautify JSON with syntax highlighting",
  category: "Text Tools", catIcon: "✏️",
  render(body) {
    let jsonFile = null;

    // File upload
    createDropZone(body, {
      accept: ".json", multiple: false,
      label: "Drop a JSON file OR paste JSON below", 
      onFiles(f) { 
        jsonFile = f[0]; 
        createFileList(body, [jsonFile], { onRemove: () => { jsonFile=null; } });
        // Auto-load and format
        setTimeout(() => {
          document.querySelector("#btnFormat")?.click();
        }, 100);
      }
    });

    // Text input
    const inputContainer = document.createElement("div");
    inputContainer.className = "input-container";
    inputContainer.innerHTML = `
      <textarea id="jsonInput" class="input-field" placeholder='Paste JSON here or drop a file above...' rows="8" style="font-family: monospace; font-size: 12px;"></textarea>
    `;
    body.appendChild(inputContainer);

    // Options
    const opts = document.createElement("div"); opts.className = "opts-panel";
    opts.innerHTML = `
      <div class="opt-group">
        <span class="opt-label">Indent:</span>
        <select class="opt-select" id="indentSize">
          <option value="2">2 spaces</option>
          <option value="4" selected>4 spaces</option>
          <option value="1">Tabs</option>
        </select>
      </div>
      <div class="opt-group">
        <input type="checkbox" id="sortKeys" class="opt-checkbox" />
        <span class="opt-label">Sort keys alphabetically</span>
      </div>
    `;
    body.appendChild(opts);

    // Buttons
    const row = document.createElement("div"); row.className = "action-row";
    row.innerHTML = `
      <button class="btn-action" id="btnFormat">{} Format</button>
      <button class="btn-action" id="btnMinify">📦 Minify</button>
      <button class="btn-action" id="btnCopy">📋 Copy</button>
    `;
    body.appendChild(row);

    const jsonInput = body.querySelector("#jsonInput");
    const indentSelect = body.querySelector("#indentSize");
    const sortKeysCheck = body.querySelector("#sortKeys");

    body.querySelector("#btnFormat").addEventListener("click", async () => {
      let jsonText = jsonFile ? await jsonFile.text() : jsonInput.value.trim();
      if (!jsonText) return showStatus(body, "Enter or upload JSON first", "error");

      try {
        const parsed = JSON.parse(jsonText);
        const indent = indentSelect.value === "1" ? "\t" : " ".repeat(parseInt(indentSelect.value));
        
        let formatted = JSON.stringify(parsed, null, indent);
        
        // Sort keys if enabled
        if (sortKeysCheck.checked) {
          const sorted = JSON.parse(formatted);
          formatted = JSON.stringify(sortObjectKeys(sorted), null, indent);
        }
        
        jsonInput.value = formatted;
        showStatus(body, "✅ Valid JSON - Formatted!", "ok");
        addResult(body, new Blob([formatted], { type: "application/json" }), "formatted.json");
      } catch (e) {
        showStatus(body, "❌ Invalid JSON: " + e.message, "error");
      }
    });

    body.querySelector("#btnMinify").addEventListener("click", () => {
      let jsonText = jsonInput.value.trim();
      if (!jsonText) return showStatus(body, "Enter JSON first", "error");

      try {
        const parsed = JSON.parse(jsonText);
        const minified = JSON.stringify(parsed);
        jsonInput.value = minified;
        showStatus(body, "Minified JSON", "ok");
        addResult(body, new Blob([minified], { type: "application/json" }), "minified.json");
      } catch (e) {
        showStatus(body, "Invalid JSON: " + e.message, "error");
      }
    });

    body.querySelector("#btnCopy").addEventListener("click", () => {
      const text = jsonInput.value;
      if (!text) return showStatus(body, "Nothing to copy", "error");
      navigator.clipboard.writeText(text).then(() => {
        showStatus(body, "Copied to clipboard! 📋", "ok");
      });
    });
  }
});

/* QR Code Generator */
registerTool({
  id: "qr-generator", name: "QR Code Generator", icon: "📱", desc: "Generate QR codes from text or URLs",
  category: "Text Tools", catIcon: "✏️",
  render(body) {
    const inputContainer = document.createElement("div");
    inputContainer.className = "input-container";
    inputContainer.innerHTML = `
      <div class="input-group">
        <label for="qrText" class="input-label">Enter text or URL:</label>
        <textarea id="qrText" class="input-field" placeholder="Type text, URL, WiFi details, vCard, etc." rows="3"></textarea>
      </div>
    `;
    body.appendChild(inputContainer);

    // Options
    const opts = document.createElement("div"); opts.className = "opts-panel";
    opts.innerHTML = `
      <div class="opt-group">
        <span class="opt-label">Size:</span>
        <select class="opt-select" id="qrSize">
          <option value="200">Small (200x200)</option>
          <option value="300" selected>Medium (300x300)</option>
          <option value="500">Large (500x500)</option>
          <option value="800">Extra Large (800x800)</option>
        </select>
      </div>
      <div class="opt-group">
        <span class="opt-label">Format:</span>
        <select class="opt-select" id="qrFormat">
          <option value="png" selected>PNG</option>
          <option value="jpg">JPG</option>
          <option value="svg">SVG</option>
        </select>
      </div>
      <div class="opt-group">
        <input type="checkbox" id="qrErrorCorrection" class="opt-checkbox" checked />
        <span class="opt-label">High error correction</span>
      </div>
    `;
    body.appendChild(opts);

    // Generate button
    const row = document.createElement("div"); row.className = "action-row";
    row.innerHTML = `<button class="btn-action" id="btnGenerateQR">📱 Generate QR Code</button>`;
    body.appendChild(row);

    row.querySelector("#btnGenerateQR").addEventListener("click", async () => {
      const text = body.querySelector("#qrText").value.trim();
      if (!text) return showStatus(body, "Enter text first", "error");

      clearResults(body);
      showStatus(body, "Generating QR code…", "loading");

      try {
        // Load QR code library
        if (typeof QRCode === "undefined") {
          showStatus(body, "Loading QR library…", "loading");
          await loadScript("https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js");
        }

        const size = parseInt(body.querySelector("#qrSize").value);
        const format = body.querySelector("#qrFormat").value;
        const highError = body.querySelector("#qrErrorCorrection").checked;

        // Create QR code in canvas
        const container = document.createElement("div");
        container.style.width = size + "px";
        container.style.height = size + "px";
        container.style.position = "absolute";
        container.style.left = "-9999px";
        document.body.appendChild(container);

        const qr = new QRCode(container, {
          text: text,
          width: size,
          height: size,
          colorDark: "#000000",
          colorLight: "#ffffff",
          correctLevel: highError ? QRCode.CorrectLevel.H : QRCode.CorrectLevel.M
        });

        // Wait for QR to render
        await new Promise(r => setTimeout(r, 500));

        let blob;
        const canvas = container.querySelector("canvas");
        
        if (format === "png") {
          blob = await new Promise(r => canvas.toBlob(r, "image/png"));
        } else if (format === "jpg") {
          blob = await new Promise(r => canvas.toBlob(r, "image/jpeg", 0.95));
        } else {
          // SVG format
          const svg = container.querySelector("svg") || canvas;
          const svgString = new XMLSerializer().serializeToString(svg);
          blob = new Blob([svgString], { type: "image/svg+xml" });
        }

        document.body.removeChild(container);

        clearStatus(body);
        addResult(body, blob, `qrcode.${format}`);
        showStatus(body, "QR code generated!", "ok");

      } catch (e) {
        showStatus(body, "Error: " + e.message, "error");
      }
    });
  }
});

/* Base64 Encoder/Decoder */
registerTool({
  id: "base64-converter", name: "Base64 Converter", icon: "🔐", desc: "Encode text to Base64 and decode Base64 to text",
  category: "Text Tools", catIcon: "✏️",
  render(body) {
    const inputContainer = document.createElement("div");
    inputContainer.className = "input-container";
    inputContainer.innerHTML = `
      <div class="input-group">
        <label for="base64Input" class="input-label">Input:</label>
        <textarea id="base64Input" class="input-field" placeholder="Enter text or Base64 string" rows="5" style="font-family: monospace;"></textarea>
      </div>
    `;
    body.appendChild(inputContainer);

    const row = document.createElement("div"); row.className = "action-row";
    row.innerHTML = `
      <button class="btn-action" id="btnEncode">🔒 Encode to Base64</button>
      <button class="btn-action" id="btnDecode">🔓 Decode from Base64</button>
      <button class="btn-action" id="btnCopyOutput">📋 Copy Output</button>
    `;
    body.appendChild(row);


    const textInput = body.querySelector("#base64Input");

    body.querySelector("#btnEncode").addEventListener("click", () => {
      const text = textInput.value;
      if (!text) return showStatus(body, "Enter text first", "error");
      try {
        const bytes = new TextEncoder().encode(text);
        let binary = '';
        bytes.forEach(b => binary += String.fromCharCode(b));
        const encoded = btoa(binary);
        textInput.value = encoded;
        addResult(body, new Blob([encoded], { type: "text/plain" }), "encoded.txt");
        showStatus(body, "Encoded to Base64", "ok");
      } catch (e) {
        showStatus(body, "Error: " + e.message, "error");
      }
    });

    body.querySelector("#btnDecode").addEventListener("click", () => {
      const encoded = textInput.value;
      if (!encoded) return showStatus(body, "Enter Base64 string first", "error");
      try {
        const binary = atob(encoded);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const decoded = new TextDecoder().decode(bytes);
        textInput.value = decoded;
        addResult(body, new Blob([decoded], { type: "text/plain" }), "decoded.txt");
        showStatus(body, "Decoded from Base64", "ok");
      } catch (e) {
        showStatus(body, "Invalid Base64: " + e.message, "error");
      }
    });

    body.querySelector("#btnCopyOutput").addEventListener("click", () => {
      const text = textInput.value;
      if (!text) return showStatus(body, "Nothing to copy", "error");
      navigator.clipboard.writeText(text).then(() => {
        showStatus(body, "Copied! 📋", "ok");
      });
    });
  }
});

/* Password Generator */
registerTool({
  id: "password-generator", name: "Password Generator", icon: "🔑", desc: "Generate secure random passwords",
  category: "Text Tools", catIcon: "✏️",
  render(body) {
    // Options
    const opts = document.createElement("div"); opts.className = "opts-panel";
    opts.innerHTML = `
      <div class="opt-group">
        <span class="opt-label">Length:</span>
        <input type="range" min="8" max="128" value="16" id="pwLength" class="opt-input" style="width: 100%;" />
        <span id="pwLengthVal" class="opt-label">16</span>
      </div>
      <div class="opt-group">
        <input type="checkbox" id="pwUppercase" class="opt-checkbox" checked /> <span class="opt-label">Uppercase (A-Z)</span><br>
        <input type="checkbox" id="pwLowercase" class="opt-checkbox" checked /> <span class="opt-label">Lowercase (a-z)</span><br>
        <input type="checkbox" id="pwNumbers" class="opt-checkbox" checked /> <span class="opt-label">Numbers (0-9)</span><br>
        <input type="checkbox" id="pwSpecial" class="opt-checkbox" checked /> <span class="opt-label">Special (!@#$%)</span>
      </div>
    `;
    body.appendChild(opts);

    document.getElementById("pwLength").addEventListener("input", (e) => {
      document.getElementById("pwLengthVal").textContent = e.target.value;
    });

    // Output area
    const outputContainer = document.createElement("div");
    outputContainer.className = "input-container";
    outputContainer.innerHTML = `
      <div class="input-group">
        <label for="pwOutput" class="input-label">Generated Password:</label>
        <textarea id="pwOutput" class="input-field" rows="3" style="font-family: monospace; font-size: 14px; font-weight: bold;" readonly></textarea>
      </div>
    `;
    body.appendChild(outputContainer);

    // Buttons
    const row = document.createElement("div"); row.className = "action-row";
    row.innerHTML = `
      <button class="btn-action" id="btnGenerate">🔑 Generate Password</button>
      <button class="btn-action" id="btnCopyPw">📋 Copy</button>
    `;
    body.appendChild(row);

    body.querySelector("#btnGenerate").addEventListener("click", () => {
      const length = parseInt(document.getElementById("pwLength").value);
      const useUpper = document.getElementById("pwUppercase").checked;
      const useLower = document.getElementById("pwLowercase").checked;
      const useNumbers = document.getElementById("pwNumbers").checked;
      const useSpecial = document.getElementById("pwSpecial").checked;

      if (!useUpper && !useLower && !useNumbers && !useSpecial) {
        return showStatus(body, "Select at least one character type", "error");
      }

      let chars = "";
      if (useUpper) chars += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      if (useLower) chars += "abcdefghijklmnopqrstuvwxyz";
      if (useNumbers) chars += "0123456789";
      if (useSpecial) chars += "!@#$%^&*()-_=+[]{}|;:,.<>?";

      const array = new Uint32Array(length);
      crypto.getRandomValues(array);
      let password = "";
      for (let i = 0; i < length; i++) {
        password += chars.charAt(array[i] % chars.length);
      }

      document.getElementById("pwOutput").value = password;
      addResult(body, new Blob([password], { type: "text/plain" }), "password.txt");
      showStatus(body, "Password generated!", "ok");
    });

    body.querySelector("#btnCopyPw").addEventListener("click", () => {
      const pw = document.getElementById("pwOutput").value;
      if (!pw) return showStatus(body, "Generate a password first", "error");
      navigator.clipboard.writeText(pw).then(() => {
        showStatus(body, "Copied! 🔐", "ok");
      });
    });

    // Generate on load
    setTimeout(() => {
      body.querySelector("#btnGenerate").click();
    }, 100);
  }
});

/* ── Helper Functions ── */

function sortObjectKeys(obj) {
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  } else if (obj !== null && typeof obj === "object") {
    return Object.keys(obj).sort().reduce((result, key) => {
      result[key] = sortObjectKeys(obj[key]);
      return result;
    }, {});
  }
  return obj;
}


