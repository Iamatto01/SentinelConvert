const convertForm = document.getElementById("convertForm");
const imageForm = document.getElementById("imageForm");

const convertStatus = document.getElementById("convertStatus");
const imageStatus = document.getElementById("imageStatus");

const convertDownload = document.getElementById("convertDownload");
const imageDownload = document.getElementById("imageDownload");
const imagePreview = document.getElementById("imagePreview");

const capabilitiesList = document.getElementById("capabilitiesList");
const targetSuggestions = document.getElementById("targetSuggestions");

function setStatus(element, message, kind = "idle") {
  element.textContent = message;
  element.classList.remove("ok", "error");

  if (kind === "ok") {
    element.classList.add("ok");
  }

  if (kind === "error") {
    element.classList.add("error");
  }
}

function hideResultLink(linkElement) {
  linkElement.classList.add("hidden");
  linkElement.removeAttribute("href");
}

function showResultLink(linkElement, blobUrl, filename) {
  linkElement.href = blobUrl;
  linkElement.download = filename;
  linkElement.classList.remove("hidden");
}

function extractFilename(contentDisposition, fallbackName) {
  if (!contentDisposition) {
    return fallbackName;
  }

  const matched = /filename="?([^";]+)"?/i.exec(contentDisposition);
  return matched ? matched[1] : fallbackName;
}

async function parseError(response) {
  try {
    const payload = await response.json();
    if (payload.detail) {
      return payload.detail;
    }
  } catch {
    // Keep default error below if payload parsing fails.
  }
  return `Request failed with status ${response.status}`;
}

function createCapabilityGroup(title, values) {
  const group = document.createElement("section");
  group.className = "capability-group";

  const heading = document.createElement("h3");
  heading.textContent = title;

  const body = document.createElement("p");
  body.textContent = Array.isArray(values) ? values.join(", ") : String(values);

  group.appendChild(heading);
  group.appendChild(body);
  return group;
}

function updateTargetSuggestions(capabilities) {
  const formats = new Set();

  [
    capabilities.image_formats,
    capabilities.media_formats,
    capabilities.archive_formats,
    capabilities.structured_formats,
    capabilities.document_formats_via_pandoc,
  ].forEach((list) => {
    if (Array.isArray(list)) {
      list.forEach((item) => formats.add(item));
    }
  });

  targetSuggestions.replaceChildren();
  Array.from(formats)
    .sort((a, b) => a.localeCompare(b))
    .forEach((item) => {
      const option = document.createElement("option");
      option.value = item;
      targetSuggestions.appendChild(option);
    });
}

async function loadCapabilities() {
  try {
    const response = await fetch("/api/capabilities");
    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    const capabilities = await response.json();
    capabilitiesList.replaceChildren(
      createCapabilityGroup("Image formats", capabilities.image_formats || []),
      createCapabilityGroup("Media formats (FFmpeg)", capabilities.media_formats || []),
      createCapabilityGroup("Archive formats", capabilities.archive_formats || []),
      createCapabilityGroup("Structured data", capabilities.structured_formats || []),
      createCapabilityGroup("Document formats (Pandoc)", capabilities.document_formats_via_pandoc || []),
      createCapabilityGroup("Notes", capabilities.notes || [])
    );

    updateTargetSuggestions(capabilities);
  } catch (error) {
    capabilitiesList.textContent = `Failed to load capabilities: ${error.message}`;
  }
}

convertForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideResultLink(convertDownload);
  setStatus(convertStatus, "Converting file...", "idle");
  const startedAt = performance.now();

  const formData = new FormData(convertForm);

  try {
    const response = await fetch("/api/convert", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const filename = extractFilename(
      response.headers.get("content-disposition"),
      "converted_file"
    );
    const elapsedSeconds = ((performance.now() - startedAt) / 1000).toFixed(2);

    showResultLink(convertDownload, blobUrl, filename);
    setStatus(convertStatus, `Conversion completed in ${elapsedSeconds}s: ${filename}`, "ok");
  } catch (error) {
    setStatus(convertStatus, error.message, "error");
  }
});

imageForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  hideResultLink(imageDownload);
  imagePreview.classList.add("hidden");
  imagePreview.removeAttribute("src");

  const formData = new FormData(imageForm);
  const removeBackground = document.getElementById("removeBackground").checked;
  setStatus(
    imageStatus,
    removeBackground
      ? "Removing background and converting image... first run can take longer."
      : "Processing image...",
    "idle"
  );
  const startedAt = performance.now();
  formData.set("remove_background", removeBackground ? "true" : "false");

  try {
    const response = await fetch("/api/image/process", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const filename = extractFilename(
      response.headers.get("content-disposition"),
      "processed_image"
    );
    const elapsedSeconds = ((performance.now() - startedAt) / 1000).toFixed(2);

    showResultLink(imageDownload, blobUrl, filename);

    imagePreview.src = blobUrl;
    imagePreview.classList.remove("hidden");

    setStatus(imageStatus, `Image ready in ${elapsedSeconds}s: ${filename}`, "ok");
  } catch (error) {
    setStatus(imageStatus, error.message, "error");
  }
});

loadCapabilities();
