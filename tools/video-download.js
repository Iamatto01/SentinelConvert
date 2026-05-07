/* ═══════════════════════════════════════════════════════
   Media Download Tools — Download Videos and Audio
   ═══════════════════════════════════════════════════════ */

/* Video/Audio URL Downloader Tool */
registerTool({
  id: "media-download", name: "Download Video/Audio", icon: "⬇️", desc: "Download video/audio from URLs (HLS, MP4, direct links)",
  category: "Media Tools", catIcon: "🎞️",
  render(body) {
    let urlInput = null;

    // URL Input Section
    const inputContainer = document.createElement("div");
    inputContainer.className = "input-container";
    inputContainer.innerHTML = `
      <div class="input-group">
        <label for="mediaUrl" class="input-label">Paste video/audio URL here:</label>
        <textarea id="mediaUrl" class="input-field" placeholder="e.g., https://example.com/video.mp4 or HLS stream URL" rows="3"></textarea>
        <small class="input-hint">
          Supported: Direct MP4/WebM/HLS/DASH links • 
          <strong>Note:</strong> Social media downloads may not work due to restrictions. 
          Use external downloaders for YouTube, TikTok, Instagram, etc.
        </small>
      </div>
    `;
    body.appendChild(inputContainer);
    urlInput = body.querySelector("#mediaUrl");

    // Format Selection
    const opts = document.createElement("div"); opts.className = "opts-panel";
    opts.innerHTML = `
      <div class="opt-group">
        <span class="opt-label">Save as:</span>
        <select class="opt-select" id="downloadFormat">
          <option value="auto" selected>Auto-detect (original format)</option>
          <option value="mp4">MP4 Video</option>
          <option value="webm">WebM Video</option>
          <option value="mp3">MP3 Audio</option>
          <option value="wav">WAV Audio</option>
        </select>
      </div>
      <div class="opt-group">
        <input type="checkbox" id="extractAudio" class="opt-checkbox" />
        <span class="opt-label">Extract audio only (MP3)</span>
      </div>
    `;
    body.appendChild(opts);

    document.getElementById("extractAudio").addEventListener("change", (e) => {
      if (e.target.checked) {
        document.getElementById("downloadFormat").value = "mp3";
      }
    });

    // Download Button
    const row = document.createElement("div"); row.className = "action-row";
    row.innerHTML = `<button class="btn-action" id="btnDownload">⬇️ Download Media</button>`;
    body.appendChild(row);

    row.querySelector("#btnDownload").addEventListener("click", async () => {
      const url = urlInput.value.trim();
      if (!url) return showStatus(body, "Enter a URL first", "error");

      clearResults(body);
      showStatus(body, "Preparing download…", "loading");

      try {
        const format = document.getElementById("downloadFormat").value;
        const extractAudio = document.getElementById("extractAudio").checked;

        // Try direct download first
        showStatus(body, "Downloading…", "loading");
        
        const response = await fetch(url, {
          method: 'GET',
          mode: 'cors',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        if (!response.ok) {
          // Try with CORS proxy
          const proxyUrl = `https://cors-anywhere.herokuapp.com/${url}`;
          const proxyResponse = await fetch(proxyUrl, {
            method: 'GET',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });

          if (!proxyResponse.ok) {
            throw new Error(`Failed to download (HTTP ${response.status || proxyResponse.status}). Check URL and try again.`);
          }

          const blob = await proxyResponse.blob();
          handleDownloadedMedia(body, blob, url, format, extractAudio);
        } else {
          const blob = await response.blob();
          handleDownloadedMedia(body, blob, url, format, extractAudio);
        }

      } catch (e) {
        showStatus(body, "Error: " + e.message + "\n💡 Tip: Social media downloads require external tools. Try: youtube-dl, yt-dlp, or online converters.", "error");
      }
    });
  }
});

/* Helper: Process Downloaded Media */
async function handleDownloadedMedia(body, blob, url, format, extractAudio) {
  try {
    showStatus(body, "Processing media…", "loading");

    // Determine filename
    let filename = url.split('/').pop().split('?')[0] || 'download';
    if (!filename.includes('.')) {
      const contentType = blob.type;
      const ext = contentType.includes('video') ? 'mp4' : contentType.includes('audio') ? 'mp3' : 'bin';
      filename = `downloaded_media.${ext}`;
    }

    // If format conversion or audio extraction needed
    if (format !== 'auto' || extractAudio) {
      showStatus(body, "Loading converter (first time ~30MB)…", "loading");

      // Use FFmpeg for conversion
      let ffmpegInstance = null;
      const { FFmpeg } = await import("https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/+esm");
      const { fetchFile, toBlobURL } = await import("https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/+esm");

      const ffmpeg = new FFmpeg();
      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";

      ffmpeg.on("progress", ({ progress }) => {
        showStatus(body, `Converting… ${Math.round(progress * 100)}%`, "loading");
      });

      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });

      showStatus(body, "Processing file…", "loading");

      // Write input file
      const inputName = `input${filename.substring(filename.lastIndexOf('.'))}`;
      await ffmpeg.writeFile(inputName, new Uint8Array(await blob.arrayBuffer()));

      let outputName = filename;
      let targetFormat = format;

      if (extractAudio || format === 'mp3') {
        outputName = filename.substring(0, filename.lastIndexOf('.')) + '.mp3';
        targetFormat = 'mp3';
      } else if (format !== 'auto') {
        outputName = filename.substring(0, filename.lastIndexOf('.')) + `.${format}`;
      }

      // FFmpeg conversion command
      const args = ["-i", inputName];
      if (targetFormat === 'mp3') {
        args.push("-q:a", "0", "-map", "a");
      } else if (targetFormat === 'mp4') {
        args.push("-preset", "ultrafast", "-crf", "28");
      }
      args.push(outputName);

      showStatus(body, "Converting…", "loading");
      await ffmpeg.exec(args);

      const data = await ffmpeg.readFile(outputName);
      const convertedBlob = new Blob([data.buffer], { 
        type: targetFormat === 'mp3' ? 'audio/mpeg' : `video/${targetFormat}` 
      });

      clearResults(body);
      addResult(body, convertedBlob, outputName);

      // Cleanup
      try { await ffmpeg.deleteFile(inputName); } catch {}
      try { await ffmpeg.deleteFile(outputName); } catch {}

    } else {
      // Direct download without conversion
      clearResults(body);
      addResult(body, blob, filename);
    }

    clearStatus(body);
    showStatus(body, "Downloaded successfully!", "ok");

  } catch (e) {
    showStatus(body, "Conversion error: " + e.message, "error");
  }
}

/* YouTube/Social Media Video Downloader (Proxy-based) */
registerTool({
  id: "social-video-downloader", name: "Social Media Video Downloader", icon: "📹", desc: "Download from YouTube, TikTok, Instagram (via API)",
  category: "Media Tools", catIcon: "🎞️",
  render(body) {
    const inputContainer = document.createElement("div");
    inputContainer.className = "input-container";
    inputContainer.innerHTML = `
      <div class="input-group">
        <label for="socialUrl" class="input-label">Paste social media URL:</label>
        <textarea id="socialUrl" class="input-field" placeholder="e.g., https://www.youtube.com/watch?v=... or TikTok URL" rows="2"></textarea>
        <small class="input-hint">
          YouTube • TikTok • Instagram • Facebook • Twitter/X • Reddit • Vimeo and more
        </small>
      </div>
    `;
    body.appendChild(inputContainer);

    // Quality selection
    const opts = document.createElement("div"); opts.className = "opts-panel";
    opts.innerHTML = `
      <div class="opt-group">
        <span class="opt-label">Quality:</span>
        <select class="opt-select" id="videoQuality">
          <option value="best">Best available</option>
          <option value="720p">720p (HD)</option>
          <option value="480p">480p (SD)</option>
          <option value="audio">Audio only</option>
        </select>
      </div>
    `;
    body.appendChild(opts);

    // Download button
    const row = document.createElement("div"); row.className = "action-row";
    row.innerHTML = `<button class="btn-action" id="btnDownloadSocial">📹 Download Video</button>`;
    body.appendChild(row);

    row.querySelector("#btnDownloadSocial").addEventListener("click", async () => {
      const url = body.querySelector("#socialUrl").value.trim();
      if (!url) return showStatus(body, "Enter a URL first", "error");

      clearResults(body);
      showStatus(body, "Processing link…", "loading");

      try {
        const quality = document.getElementById("videoQuality").value;

        // Use a free video download API
        showStatus(body, "Fetching video info…", "loading");

        // Use co.wuk API (free, no auth needed)
        const apiUrl = `https://api.cobalt.tools/api/json`;
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            url: url,
            vCodec: quality === 'audio' ? 'none' : 'h264',
            aCodec: 'aac',
            fileMetadata: null,
            isAudioOnly: quality === 'audio',
            isNoTTWatermark: true,
            isTTFullAudio: false,
            isAudioMuted: false
          })
        });

        if (!response.ok) {
          throw new Error(`API Error: ${response.status}. The URL might be invalid or the platform is not supported.`);
        }

        const data = await response.json();

        if (data.status !== 'success' || !data.url) {
          throw new Error(data.error || "Could not extract video URL");
        }

        showStatus(body, "Downloading…", "loading");

        // Download the video
        const videoResponse = await fetch(data.url);
        const videoBlob = await videoResponse.blob();

        const filename = data.filename || `video_${Date.now()}.${quality === 'audio' ? 'mp3' : 'mp4'}`;

        clearResults(body);
        addResult(body, videoBlob, filename);
        clearStatus(body);
        showStatus(body, "Downloaded successfully!", "ok");

      } catch (e) {
        showStatus(body, `Error: ${e.message}\n\n💡 Try: yt-dlp, youtube-dl, or online video downloaders if this fails.`, "error");
      }
    });
  }
});
