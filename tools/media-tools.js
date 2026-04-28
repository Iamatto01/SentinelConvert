/* Media Conversion Tool */
let ffmpegInstance = null;

async function ensureFFmpeg(progressCallback) {
  if (ffmpegInstance) return ffmpegInstance;

  const { FFmpeg } = await import("https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/+esm");
  const { fetchFile, toBlobURL } = await import("https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/+esm");

  const ffmpeg = new FFmpeg();
  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";

  ffmpeg.on("progress", ({ progress }) => {
    if (progressCallback) progressCallback(Math.round(progress * 100));
  });

  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
  });

  ffmpeg._fetchFile = fetchFile;
  ffmpegInstance = ffmpeg;
  return ffmpeg;
}

registerTool({
  id: "media-convert", name: "Video/Audio Converter", icon: "🎬", desc: "Convert between video and audio formats (Note: first try is slow)",
  category: "Media Tools", catIcon: "🎞️",
  render(body) {
    let file = null;
    createDropZone(body, {
      accept: "video/*, audio/*", multiple: false,
      label: "Drop a video or audio file here", sublabel: "MP4, WEBM, MKV, AVI, MP3, WAV, OGG, etc.",
      onFiles(f) { file = f[0]; createFileList(body, [file], { onRemove: () => file=null }); }
    });

    const opts = document.createElement("div"); opts.className = "opts-panel";
    opts.innerHTML = `<div class="opt-group"><span class="opt-label">Convert to:</span>
      <select class="opt-select" id="targetMediaFmt">
        <optgroup label="Video">
          <option value="mp4">MP4</option><option value="webm">WEBM</option>
          <option value="mkv">MKV</option><option value="avi">AVI</option>
        </optgroup>
        <optgroup label="Audio">
          <option value="mp3">MP3</option><option value="wav">WAV</option>
          <option value="ogg">OGG</option><option value="flac">FLAC</option>
        </optgroup>
      </select></div>`;
    body.appendChild(opts);

    const row = document.createElement("div"); row.className = "action-row";
    row.innerHTML = `<button class="btn-action" id="btnConvertMedia">🎬 Convert Media</button>`;
    body.appendChild(row);

    row.querySelector("#btnConvertMedia").addEventListener("click", async () => {
      if (!file) return showStatus(body, "Add a media file first", "error");
      const targetExt = document.getElementById("targetMediaFmt").value;
      clearResults(body); showStatus(body, "Loading FFmpeg (first time ~30MB)…", "loading");

      try {
        const ffmpeg = await ensureFFmpeg((pct) => showStatus(body, `Converting… ${pct}%`, "loading"));
        
        const inputName = "input." + getExt(file.name);
        const outputName = "output." + targetExt;

        showStatus(body, "Reading file…", "loading");
        await ffmpeg.writeFile(inputName, await ffmpeg._fetchFile(file));

        showStatus(body, "Converting… 0%", "loading");
        // Simple fast preset for video conversion
        const args = ["-i", inputName];
        if (["mp4", "mkv", "avi", "webm"].includes(targetExt)) {
           // For fast video conversion
           args.push("-preset", "ultrafast");
        }
        args.push(outputName);

        await ffmpeg.exec(args);

        const data = await ffmpeg.readFile(outputName);
        
        // Clean up
        try { await ffmpeg.deleteFile(inputName); } catch {}
        try { await ffmpeg.deleteFile(outputName); } catch {}

        const mime = ["mp3","wav","ogg","flac"].includes(targetExt) ? `audio/${targetExt}` : `video/${targetExt}`;
        const blob = new Blob([data.buffer], { type: mime });

        clearStatus(body);
        addResult(body, blob, `${stem(file.name)}.${targetExt}`);
        showStatus(body, "Media converted successfully!", "ok");

      } catch (e) {
        showStatus(body, "Error: " + e.message, "error");
      }
    });
  }
});

/* Extract Audio Tool */
registerTool({
  id: "extract-audio", name: "Extract Audio", icon: "🎵", desc: "Extract MP3 audio from a video file (Note: first try is slow)",
  category: "Media Tools", catIcon: "🎞️",
  render(body) {
    let file = null;
    createDropZone(body, {
      accept: "video/*", multiple: false,
      label: "Drop a video file here", sublabel: "Extracts the audio track to an MP3 file",
      onFiles(f) { file = f[0]; createFileList(body, [file], { onRemove: () => file=null }); }
    });

    const row = document.createElement("div"); row.className = "action-row";
    row.innerHTML = `<button class="btn-action" id="btnExtractAudio">🎵 Extract MP3</button>`;
    body.appendChild(row);

    row.querySelector("#btnExtractAudio").addEventListener("click", async () => {
      if (!file) return showStatus(body, "Add a video file first", "error");
      clearResults(body); showStatus(body, "Loading FFmpeg (first time ~30MB)…", "loading");

      try {
        const ffmpeg = await ensureFFmpeg((pct) => showStatus(body, `Extracting… ${pct}%`, "loading"));
        
        const inputName = "input." + getExt(file.name);
        const outputName = "output.mp3";

        showStatus(body, "Reading file…", "loading");
        await ffmpeg.writeFile(inputName, await ffmpeg._fetchFile(file));

        showStatus(body, "Extracting… 0%", "loading");
        await ffmpeg.exec(["-i", inputName, "-q:a", "0", "-map", "a", outputName]);

        const data = await ffmpeg.readFile(outputName);
        
        try { await ffmpeg.deleteFile(inputName); } catch {}
        try { await ffmpeg.deleteFile(outputName); } catch {}

        const blob = new Blob([data.buffer], { type: "audio/mp3" });

        clearStatus(body);
        addResult(body, blob, `${stem(file.name)}.mp3`);
        showStatus(body, "Audio extracted successfully!", "ok");

      } catch (e) {
        showStatus(body, "Error: " + e.message, "error");
      }
    });
  }
});

function getExt(filename) {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}
