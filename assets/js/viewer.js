(function () {
  const dataApi = window.NotesSiteData;
  if (!dataApi) {
    return;
  }

  const params = new URLSearchParams(location.search);
  const requestedFile = params.get("note");

  const elements = {
    title: document.getElementById("viewerTitle"),
    summary: document.getElementById("viewerSummary"),
    meta: document.getElementById("viewerMeta"),
    backHome: document.getElementById("backHomeLink"),
    openRaw: document.getElementById("openRawLink"),
    frame: document.getElementById("noteFrame"),
    frameStatus: document.getElementById("frameStatus"),
    framePill: document.getElementById("framePill"),
    relatedNotes: document.getElementById("relatedNotes")
  };

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    }[character]));
  }

  function renderMeta(note) {
    elements.meta.innerHTML = [
      note.category,
      note.level,
      note.readTime,
      note.updated
    ]
      .filter(Boolean)
      .map((value) => `<span>${escapeHTML(value)}</span>`)
      .join("");
  }

  function setTitle(value) {
    const titleLink = elements.title.querySelector("a");
    if (titleLink) {
      titleLink.textContent = value;
      return;
    }

    elements.title.textContent = value;
  }

  function renderRelated(notes, currentFileName) {
    const related = notes
      .filter((note) => note.fileName !== currentFileName)
      .slice(0, 3);

    if (!related.length) {
      elements.relatedNotes.innerHTML = `
        <article class="viewer-empty">
          <p>No additional notes are available yet.</p>
        </article>
      `;
      return;
    }

    elements.relatedNotes.innerHTML = related
      .map((note) => `
        <article class="viewer-related-card">
          <div class="viewer-label">${escapeHTML(note.category)}</div>
          <h3>${escapeHTML(note.title)}</h3>
          <p>${escapeHTML(note.summary)}</p>
          <a href="${note.href}">Open note</a>
        </article>
      `)
      .join("");
  }

  function renderError(message) {
    document.title = "Verdant Notes | Viewer";
    setTitle("Note not found");
    elements.summary.textContent = message;
    elements.meta.innerHTML = '<span>Viewer error</span>';
    elements.frameStatus.textContent = "Unable to load content";
    elements.framePill.textContent = "Missing";
    elements.frame.removeAttribute("src");
    elements.relatedNotes.innerHTML = `
      <article class="viewer-empty">
        <p>${escapeHTML(message)}</p>
      </article>
    `;
  }

  function resizeFrame() {
    try {
      const frameDocument = elements.frame.contentDocument;
      if (!frameDocument) {
        return;
      }

      const height = Math.max(
        frameDocument.documentElement.scrollHeight,
        frameDocument.body ? frameDocument.body.scrollHeight : 0
      );

      if (height > 0) {
        elements.frame.style.height = `${Math.min(height + 16, 4800)}px`;
      }
    } catch (error) {
      return;
    }
  }

  elements.frame.addEventListener("load", () => {
    elements.frameStatus.textContent = "Original note loaded";
    elements.framePill.textContent = "Ready";
    resizeFrame();
  });

  window.addEventListener("resize", resizeFrame);

  dataApi.loadNotesCatalog({ rootPath: "." }).then((result) => {
    if (!requestedFile) {
      renderError("Pick a note from the homepage library to open it in the viewer.");
      return;
    }

    const note = result.notes.find((entry) => entry.fileName === requestedFile);
    if (!note) {
      renderError(`The note "${requestedFile}" is not available in the current catalog.`);
      return;
    }

    document.title = `${note.title} | Verdant Notes`;
    setTitle(note.title);
    elements.summary.textContent = note.summary;
    renderMeta(note);
    renderRelated(result.notes, note.fileName);

    elements.backHome.href = "./index.html#library";
    elements.openRaw.href = note.directHref;
    elements.frame.src = note.directHref;
    elements.frameStatus.textContent = "Loading original note";
    elements.framePill.textContent = "Syncing";
  });
})();
