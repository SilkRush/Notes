(function () {
  const dataApi = window.NotesSiteData;
  if (!dataApi) {
    return;
  }

  const FAVORITES_KEY = "verdant-notes:favorites";
  const RECENT_KEY = "verdant-notes:recent";
  const rootPath = ".";

  const elements = {
    heroCount: document.getElementById("heroCount"),
    heroFavorites: document.getElementById("heroFavorites"),
    heroSource: document.getElementById("heroSource"),
    featuredLink: document.getElementById("featuredLink"),
    lastSync: document.getElementById("lastSync"),
    visibleCount: document.getElementById("visibleCount"),
    categoryCount: document.getElementById("categoryCount"),
    recentLabel: document.getElementById("recentLabel"),
    helperCopy: document.getElementById("helperCopy"),
    sourcePill: document.getElementById("sourcePill"),
    searchInput: document.getElementById("searchInput"),
    sortSelect: document.getElementById("sortSelect"),
    favoritesOnly: document.getElementById("favoritesOnly"),
    clearFilters: document.getElementById("clearFilters"),
    categoryFilters: document.getElementById("categoryFilters"),
    recentStrip: document.getElementById("recentStrip"),
    notesGrid: document.getElementById("notesGrid"),
    emptyState: document.getElementById("emptyState"),
    refreshButton: document.getElementById("refreshButton")
  };

  const state = {
    notes: [],
    source: "Loading",
    query: "",
    category: "All",
    sortBy: "featured",
    favoritesOnly: false
  };

  function loadStoredList(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(value) ? value : [];
    } catch (error) {
      return [];
    }
  }

  function saveStoredList(key, items) {
    localStorage.setItem(key, JSON.stringify(items));
  }

  function getFavorites() {
    return loadStoredList(FAVORITES_KEY);
  }

  function getRecent() {
    return loadStoredList(RECENT_KEY);
  }

  function setFavorites(items) {
    saveStoredList(FAVORITES_KEY, items);
  }

  function setRecent(items) {
    saveStoredList(RECENT_KEY, items);
  }

  function isFavorite(fileName) {
    return getFavorites().includes(fileName);
  }

  function rememberOpenedNote(fileName) {
    const nextRecent = [fileName].concat(getRecent().filter((item) => item !== fileName)).slice(0, 4);
    setRecent(nextRecent);
    renderRecentStrip();
    updateSummaryMetrics(getFilteredNotes());
  }

  function formatSyncTime() {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }).format(new Date());
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    }[character]));
  }

  function getCategories() {
    return ["All"].concat(
      Array.from(new Set(state.notes.map((note) => note.category))).sort((left, right) => left.localeCompare(right))
    );
  }

  function getPublicSourceLabel(source) {
    const value = String(source || "");

    if (value.includes("GitHub")) {
      return "Live";
    }

    if (value.includes("fallback") || value.includes("Manifest") || value.includes("Starter")) {
      return "Ready";
    }

    return "Loading";
  }

  function getRecentRank(fileName) {
    const rank = getRecent().indexOf(fileName);
    return rank === -1 ? Number.MAX_SAFE_INTEGER : rank;
  }

  function getFilteredNotes() {
    const query = state.query.trim().toLowerCase();

    const filtered = state.notes.filter((note) => {
      const matchesQuery = !query || note.searchText.includes(query);
      const matchesCategory = state.category === "All" || note.category === state.category;
      const matchesFavorite = !state.favoritesOnly || isFavorite(note.fileName);
      return matchesQuery && matchesCategory && matchesFavorite;
    });

    const sorted = filtered.slice().sort((left, right) => {
      if (state.sortBy === "title") {
        return left.title.localeCompare(right.title);
      }

      if (state.sortBy === "category") {
        return left.category.localeCompare(right.category) || left.title.localeCompare(right.title);
      }

      if (state.sortBy === "recent") {
        return getRecentRank(left.fileName) - getRecentRank(right.fileName) || left.title.localeCompare(right.title);
      }

      if (left.featured !== right.featured) {
        return Number(right.featured) - Number(left.featured);
      }

      return left.title.localeCompare(right.title);
    });

    return sorted;
  }

  function renderCategoryFilters() {
    elements.categoryFilters.innerHTML = getCategories()
      .map((category) => `
        <button
          class="filter-chip ${category === state.category ? "is-active" : ""}"
          type="button"
          data-category="${escapeHTML(category)}"
        >
          ${escapeHTML(category)}
        </button>
      `)
      .join("");
  }

  function createRecentCard(note) {
    return `
      <article class="recent-card">
        <div class="dashboard-label">Recent note</div>
        <h3>${escapeHTML(note.title)}</h3>
        <p>${escapeHTML(note.summary)}</p>
        <a class="note-link js-note-link" href="${note.href}" data-file-name="${escapeHTML(note.fileName)}">Continue reading</a>
      </article>
    `;
  }

  function renderRecentStrip() {
    const recentNotes = getRecent()
      .map((fileName) => state.notes.find((note) => note.fileName === fileName))
      .filter(Boolean);

    if (!recentNotes.length) {
      elements.recentStrip.hidden = true;
      elements.recentStrip.innerHTML = "";
      elements.recentLabel.textContent = "None yet";
      return;
    }

    elements.recentStrip.hidden = false;
    elements.recentStrip.innerHTML = recentNotes.map(createRecentCard).join("");
    elements.recentLabel.textContent = recentNotes[0].title;
  }

  function createNoteCard(note, index) {
    const favorite = isFavorite(note.fileName);
    const tags = note.tags.slice(0, 3);

    return `
      <article class="note-card ${favorite ? "is-favorite" : ""}">
        <div class="note-head">
          <div>
            <span class="note-badge">${escapeHTML(note.category)}</span>
            <div class="note-index">#${String(index + 1).padStart(2, "0")}</div>
          </div>
          <button
            class="favorite-button js-favorite ${favorite ? "is-active" : ""}"
            type="button"
            aria-label="${favorite ? "Remove favorite" : "Add favorite"}"
            data-file-name="${escapeHTML(note.fileName)}"
          >
            ${favorite ? "Saved" : "Save"}
          </button>
        </div>

        <div>
          <h3 class="note-title">${escapeHTML(note.title)}</h3>
        </div>

        <p class="note-summary">${escapeHTML(note.summary)}</p>

        <div class="note-tags">
          ${tags.map((tag) => `<span>${escapeHTML(tag)}</span>`).join("")}
        </div>

        <div class="note-footer">
          <div class="note-meta">
            <span>${escapeHTML(note.level)}</span>
            <span>${escapeHTML(note.readTime)}</span>
            <span>${escapeHTML(note.updated)}</span>
          </div>
          <a
            class="note-link js-note-link"
            href="${note.href}"
            data-file-name="${escapeHTML(note.fileName)}"
          >
            Open note
          </a>
        </div>
      </article>
    `;
  }

  function renderEmptyState() {
    elements.emptyState.hidden = false;
    elements.emptyState.innerHTML = `
      <h3>No notes match this view</h3>
      <p>Try clearing filters, searching with a broader term, or turning off favorites-only mode.</p>
    `;
  }

  function updateSummaryMetrics(visibleNotes) {
    const favoritesCount = getFavorites().length;
    const categoryCount = new Set(state.notes.map((note) => note.category)).size;
    const publicSource = getPublicSourceLabel(state.source);

    elements.heroCount.textContent = String(state.notes.length).padStart(2, "0");
    elements.heroFavorites.textContent = String(favoritesCount).padStart(2, "0");
    elements.heroSource.textContent = publicSource;
    elements.visibleCount.textContent = String(visibleNotes.length).padStart(2, "0");
    elements.categoryCount.textContent = String(categoryCount).padStart(2, "0");
    elements.helperCopy.textContent = `Showing ${visibleNotes.length} of ${state.notes.length} note${state.notes.length === 1 ? "" : "s"}.`;
    elements.sourcePill.textContent = publicSource;
  }

  function updateFeaturedLink() {
    if (!elements.featuredLink) {
      return;
    }

    const featuredNote = state.notes.find((note) => note.featured) || state.notes[0];
    if (!featuredNote) {
      elements.featuredLink.href = "#library";
      return;
    }

    elements.featuredLink.href = featuredNote.href;
    elements.featuredLink.textContent = `Open ${featuredNote.title}`;
  }

  function renderNotes() {
    const visibleNotes = getFilteredNotes();
    updateSummaryMetrics(visibleNotes);

    if (!visibleNotes.length) {
      elements.notesGrid.innerHTML = "";
      renderEmptyState();
      return;
    }

    elements.emptyState.hidden = true;
    elements.emptyState.innerHTML = "";
    elements.notesGrid.innerHTML = visibleNotes.map(createNoteCard).join("");
  }

  function setLoadingState() {
    elements.notesGrid.innerHTML = Array.from({ length: 3 }, () => `
      <article class="note-card">
        <div class="dashboard-label">Loading</div>
        <h3 class="note-title">Preparing note card</h3>
        <p class="note-summary">Fetching the catalog and stitching together note metadata.</p>
      </article>
    `).join("");
    elements.emptyState.hidden = true;
    elements.sourcePill.textContent = "Loading";
    elements.helperCopy.textContent = "Preparing the note catalog...";
  }

  async function loadCatalog() {
    setLoadingState();

    const result = await dataApi.loadNotesCatalog({ rootPath });
    state.notes = result.notes;
    state.source = result.error && result.notes.length ? `${result.source} with fallback` : result.source;
    elements.lastSync.textContent = formatSyncTime();

    updateFeaturedLink();
    renderCategoryFilters();
    renderRecentStrip();
    renderNotes();
  }

  function toggleFavorite(fileName) {
    const favorites = getFavorites();
    const nextFavorites = favorites.includes(fileName)
      ? favorites.filter((entry) => entry !== fileName)
      : favorites.concat(fileName);

    setFavorites(nextFavorites);
    renderNotes();
  }

  elements.searchInput.addEventListener("input", () => {
    state.query = elements.searchInput.value;
    renderNotes();
  });

  elements.sortSelect.addEventListener("change", () => {
    state.sortBy = elements.sortSelect.value;
    renderNotes();
  });

  elements.favoritesOnly.addEventListener("change", () => {
    state.favoritesOnly = elements.favoritesOnly.checked;
    renderNotes();
  });

  elements.clearFilters.addEventListener("click", () => {
    state.query = "";
    state.category = "All";
    state.sortBy = "featured";
    state.favoritesOnly = false;

    elements.searchInput.value = "";
    elements.sortSelect.value = "featured";
    elements.favoritesOnly.checked = false;

    renderCategoryFilters();
    renderNotes();
  });

  elements.categoryFilters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) {
      return;
    }

    state.category = button.getAttribute("data-category");
    renderCategoryFilters();
    renderNotes();
  });

  elements.notesGrid.addEventListener("click", (event) => {
    const favoriteButton = event.target.closest(".js-favorite");
    if (favoriteButton) {
      toggleFavorite(favoriteButton.getAttribute("data-file-name"));
      return;
    }

    const noteLink = event.target.closest(".js-note-link");
    if (noteLink) {
      rememberOpenedNote(noteLink.getAttribute("data-file-name"));
    }
  });

  elements.recentStrip.addEventListener("click", (event) => {
    const noteLink = event.target.closest(".js-note-link");
    if (!noteLink) {
      return;
    }

    rememberOpenedNote(noteLink.getAttribute("data-file-name"));
  });

  elements.refreshButton.addEventListener("click", loadCatalog);

  loadCatalog();
})();
