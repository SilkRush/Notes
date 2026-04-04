(function () {
  const script =
    document.currentScript ||
    Array.from(document.scripts).find((entry) => /site-shell\.js$/.test(entry.src));

  const requestedRoot = script && script.dataset ? script.dataset.root : null;
  const guessedRoot = location.pathname.includes("/notes/") || /\/notes\//.test(location.pathname)
    ? ".."
    : ".";
  const rootPath = String(requestedRoot || guessedRoot).replace(/\/+$/, "") || ".";

  function resolveFromRoot(path) {
    const cleanPath = String(path || "").replace(/^\/+/, "");
    return rootPath === "." ? `./${cleanPath}` : `${rootPath}/${cleanPath}`;
  }

  function ensureStylesheet() {
    if (
      document.querySelector('link[data-notes-shell-style="true"]') ||
      Array.from(document.querySelectorAll('link[rel="stylesheet"]')).some((entry) => entry.href.includes("/assets/css/shell.css"))
    ) {
      return;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = resolveFromRoot("assets/css/shell.css");
    link.dataset.notesShellStyle = "true";
    document.head.appendChild(link);
  }

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "section";
  }

  function icon(path) {
    return `
      <span class="notes-shell-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          ${path}
        </svg>
      </span>
    `;
  }

  function ensureMainId() {
    const main = document.querySelector("main");
    if (main && !main.id) {
      main.id = "main-content";
    }
  }

  function collectSections() {
    const sections = Array.from(document.querySelectorAll("main section"));
    const primaryLinks = [];
    const detailLinks = [];

    sections.forEach((section, index) => {
      if (!section.id) {
        section.id = slugify(section.dataset.navLabel || `section-${index + 1}`);
      }

      const sectionHeading = section.querySelector("h2, h3");
      const label = section.dataset.navLabel || (sectionHeading ? sectionHeading.textContent.trim() : `Section ${index + 1}`);

      if (label) {
        detailLinks.push({
          label,
          href: `#${section.id}`,
          meta: "On this page"
        });

        if (section.dataset.navLabel) {
          primaryLinks.push({
            label: section.dataset.navLabel,
            href: `#${section.id}`
          });
        }
      }
    });

    if (!primaryLinks.length && detailLinks.length) {
      return {
        primaryLinks: detailLinks.slice(0, 3).map((entry) => ({
          label: entry.label,
          href: entry.href
        })),
        detailLinks
      };
    }

    return {
      primaryLinks,
      detailLinks
    };
  }

  function createShell(siteName, siteShortName, pageType, primaryLinks) {
    const homeHref = resolveFromRoot("index.html");
    const templateHref = resolveFromRoot("templates/note-starter.html");
    const navLinks = pageType === "home"
      ? primaryLinks.concat([{ label: "Template", href: templateHref }])
      : [
          { label: "Home", href: homeHref },
          { label: "Library", href: `${homeHref}#library` }
        ].concat(primaryLinks.slice(0, 2)).concat([{ label: "Template", href: templateHref }]);

    const shell = document.createElement("div");
    shell.id = "notes-shell-root";
    shell.innerHTML = `
      <a class="notes-shell-skip-link" href="#main-content">Skip to content</a>
      <header class="notes-shell-topbar" aria-label="Site navigation">
        <div class="notes-shell-brand-row">
          <button class="notes-shell-btn" type="button" data-shell-action="menu" aria-expanded="false" aria-controls="notes-shell-drawer">
            ${icon('<path d="M4 7h16"></path><path d="M4 12h16"></path><path d="M4 17h16"></path>')}
            <span>Menu</span>
          </button>
          <a class="notes-shell-brand" href="${homeHref}">
            <span class="notes-shell-brand-mark">${siteShortName}</span>
            <span class="notes-shell-brand-copy">
              <strong>${siteName}</strong>
              <span>Reusable note shell</span>
            </span>
          </a>
        </div>

        <nav class="notes-shell-nav">
          ${navLinks.map((link) => `<a href="${link.href}">${link.label}</a>`).join("")}
        </nav>

        <div class="notes-shell-toolbar">
          <button class="notes-shell-btn" type="button" data-shell-action="palette">
            ${icon('<circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path>')}
            <span>Search</span>
          </button>
          <button class="notes-shell-btn notes-shell-btn-primary" type="button" data-shell-action="random">
            ${icon('<path d="M16 3h5v5"></path><path d="M4 20 21 3"></path><path d="M21 16v5h-5"></path><path d="M15 15 21 21"></path><path d="M4 4l5 5"></path>')}
            <span>Random</span>
          </button>
          <button class="notes-shell-btn" type="button" data-shell-action="share">
            ${icon('<path d="M12 5v14"></path><path d="m5 12 7-7 7 7"></path>')}
            <span>Share</span>
          </button>
        </div>
      </header>

      <div class="notes-shell-overlay" hidden></div>

      <aside class="notes-shell-drawer" id="notes-shell-drawer" aria-hidden="true">
        <div class="notes-shell-drawer-head">
          <div>
            <div class="notes-shell-kicker">Navigation</div>
            <h2>${siteName}</h2>
          </div>
          <button class="notes-shell-btn" type="button" data-shell-action="close-drawer">
            ${icon('<path d="M6 6 18 18"></path><path d="m18 6-12 12"></path>')}
            <span>Close</span>
          </button>
        </div>

        <div class="notes-shell-section">
          <h3>Quick links</h3>
          <div class="notes-shell-stack" id="notes-shell-static-links"></div>
        </div>

        <div class="notes-shell-section">
          <h3>On this page</h3>
          <div class="notes-shell-stack" id="notes-shell-section-links"></div>
        </div>

        <div class="notes-shell-section">
          <h3>Available notes</h3>
          <div class="notes-shell-stack" id="notes-shell-note-links">
            <div class="notes-shell-link-card">
              <div>
                <strong>Loading notes</strong>
                <span>Preparing quick access links</span>
              </div>
              <span class="notes-shell-mini-badge">...</span>
            </div>
          </div>
        </div>
      </aside>

      <div class="notes-shell-palette" hidden>
        <div class="notes-shell-palette-card" role="dialog" aria-modal="true" aria-label="Search navigation">
          <div class="notes-shell-palette-head">
            <input id="notes-shell-palette-input" type="search" autocomplete="off" placeholder="Search notes or sections...">
            <button class="notes-shell-btn" type="button" data-shell-action="close-palette">
              ${icon('<path d="M6 6 18 18"></path><path d="m18 6-12 12"></path>')}
              <span>Close</span>
            </button>
          </div>
          <div class="notes-shell-palette-results" id="notes-shell-palette-results"></div>
        </div>
      </div>

      <div class="notes-shell-fab" aria-label="Quick actions">
        <button class="notes-shell-btn" type="button" data-shell-action="palette">
          ${icon('<circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path>')}
        </button>
        <button class="notes-shell-btn" type="button" data-shell-action="top">
          ${icon('<path d="M12 19V5"></path><path d="m5 12 7-7 7 7"></path>')}
        </button>
      </div>
    `;

    return { shell, navLinks };
  }

  function renderLinkCards(container, items) {
    container.innerHTML = items.length
      ? items
          .map((item) => `
            <a class="notes-shell-link-card" href="${item.href}">
              <div>
                <strong>${item.label}</strong>
                <span>${item.meta || "Jump quickly"}</span>
              </div>
              <span class="notes-shell-mini-badge">${item.badge || "Go"}</span>
            </a>
          `)
          .join("")
      : `
          <div class="notes-shell-link-card">
            <div>
              <strong>No links yet</strong>
              <span>Add section ids or headings to enrich this page.</span>
            </div>
            <span class="notes-shell-mini-badge">Info</span>
          </div>
        `;
  }

  function init() {
    ensureStylesheet();
    ensureMainId();
    document.body.classList.add("notes-shell-enabled");

    const dataApi = window.NotesSiteData;
    const config = dataApi && typeof dataApi.getConfig === "function"
      ? dataApi.getConfig()
      : {
          siteName: "Verdant Notes",
          siteShortName: "VN"
        };

    const pageType = document.body.dataset.pageType || "page";
    const sections = collectSections();
    const { shell, navLinks } = createShell(
      config.siteName,
      config.siteShortName,
      pageType,
      sections.primaryLinks
    );

    document.body.prepend(shell);

    const overlay = shell.querySelector(".notes-shell-overlay");
    const drawer = shell.querySelector(".notes-shell-drawer");
    const palette = shell.querySelector(".notes-shell-palette");
    const paletteInput = shell.querySelector("#notes-shell-palette-input");
    const paletteResults = shell.querySelector("#notes-shell-palette-results");
    const staticLinksContainer = shell.querySelector("#notes-shell-static-links");
    const sectionLinksContainer = shell.querySelector("#notes-shell-section-links");
    const noteLinksContainer = shell.querySelector("#notes-shell-note-links");
    const menuButton = shell.querySelector('[data-shell-action="menu"]');
    const paletteButtons = shell.querySelectorAll('[data-shell-action="palette"]');

    renderLinkCards(
      staticLinksContainer,
      navLinks.map((entry) => ({
        label: entry.label,
        href: entry.href,
        meta: "Site navigation",
        badge: "Go"
      }))
    );

    renderLinkCards(
      sectionLinksContainer,
      sections.detailLinks.map((entry, index) => ({
        label: entry.label,
        href: entry.href,
        meta: entry.meta,
        badge: String(index + 1).padStart(2, "0")
      }))
    );

    const paletteEntries = [];

    function refreshPalette(query) {
      const searchTerm = String(query || "").trim().toLowerCase();
      const entries = paletteEntries.filter((entry) => {
        if (!searchTerm) {
          return true;
        }

        return entry.search.includes(searchTerm);
      });

      paletteResults.innerHTML = entries.length
        ? entries
            .slice(0, 12)
            .map((entry) => `
              <a class="notes-shell-palette-item" href="${entry.href}">
                <div>
                  <strong>${entry.label}</strong>
                  <span>${entry.meta}</span>
                </div>
                <span class="notes-shell-palette-tag">${entry.type}</span>
              </a>
            `)
            .join("")
        : `<div class="notes-shell-palette-empty">No matches for that search.</div>`;
    }

    function toggleDrawer(forceOpen) {
      const shouldOpen = typeof forceOpen === "boolean"
        ? forceOpen
        : !document.body.classList.contains("notes-shell-drawer-open");

      document.body.classList.toggle("notes-shell-drawer-open", shouldOpen);
      drawer.setAttribute("aria-hidden", String(!shouldOpen));
      menuButton.setAttribute("aria-expanded", String(shouldOpen));
      overlay.hidden = !shouldOpen && !document.body.classList.contains("notes-shell-palette-open");
    }

    function togglePalette(forceOpen) {
      const shouldOpen = typeof forceOpen === "boolean"
        ? forceOpen
        : !document.body.classList.contains("notes-shell-palette-open");

      document.body.classList.toggle("notes-shell-palette-open", shouldOpen);
      palette.hidden = !shouldOpen;
      overlay.hidden = !shouldOpen && !document.body.classList.contains("notes-shell-drawer-open");

      if (shouldOpen) {
        refreshPalette("");
        window.setTimeout(() => paletteInput.focus(), 20);
      }
    }

    function closeAll() {
      toggleDrawer(false);
      togglePalette(false);
    }

    shell.addEventListener("click", async (event) => {
      const actionTarget = event.target.closest("[data-shell-action]");
      if (!actionTarget) {
        if (event.target.closest("a")) {
          closeAll();
        }
        return;
      }

      const action = actionTarget.getAttribute("data-shell-action");

      if (action === "menu") {
        toggleDrawer();
      }

      if (action === "close-drawer") {
        toggleDrawer(false);
      }

      if (action === "palette") {
        togglePalette(true);
      }

      if (action === "close-palette") {
        togglePalette(false);
      }

      if (action === "top") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }

      if (action === "share") {
        try {
          await navigator.clipboard.writeText(location.href);
          actionTarget.blur();
        } catch (error) {
          window.prompt("Copy this page link", location.href);
        }
      }

      if (action === "random") {
        const noteItems = paletteEntries.filter((entry) => entry.type === "Note");
        if (noteItems.length) {
          const next = noteItems[Math.floor(Math.random() * noteItems.length)];
          location.href = next.href;
          return;
        }

        const sectionItems = paletteEntries.filter((entry) => entry.type === "Section");
        if (sectionItems.length) {
          location.href = sectionItems[Math.floor(Math.random() * sectionItems.length)].href;
        }
      }
    });

    overlay.addEventListener("click", closeAll);
    paletteInput.addEventListener("input", () => refreshPalette(paletteInput.value));
    paletteResults.addEventListener("click", closeAll);
    sectionLinksContainer.addEventListener("click", closeAll);
    staticLinksContainer.addEventListener("click", closeAll);
    noteLinksContainer.addEventListener("click", closeAll);
    paletteButtons.forEach((button) => button.setAttribute("aria-controls", "notes-shell-palette-input"));

    document.addEventListener("keydown", (event) => {
      const isTyping =
        event.target &&
        (event.target.tagName === "INPUT" ||
          event.target.tagName === "TEXTAREA" ||
          event.target.isContentEditable);

      if (event.key === "Escape") {
        closeAll();
      }

      if (!isTyping && (event.key === "/" || (event.key.toLowerCase() === "k" && (event.ctrlKey || event.metaKey)))) {
        event.preventDefault();
        togglePalette(true);
      }
    });

    paletteEntries.push(
      ...navLinks.map((entry) => ({
        label: entry.label,
        href: entry.href,
        meta: "Site navigation",
        type: "Nav",
        search: `${entry.label} site navigation`.toLowerCase()
      })),
      ...sections.detailLinks.map((entry) => ({
        label: entry.label,
        href: entry.href,
        meta: "Jump to section",
        type: "Section",
        search: `${entry.label} section`.toLowerCase()
      }))
    );
    refreshPalette("");

    if (dataApi && typeof dataApi.loadNotesCatalog === "function") {
      dataApi.loadNotesCatalog({ rootPath }).then((result) => {
        const noteCards = result.notes.map((note, index) => ({
          label: note.title,
          href: note.href,
          meta: `${note.category} | ${note.readTime}`,
          badge: String(index + 1).padStart(2, "0")
        }));

        renderLinkCards(noteLinksContainer, noteCards.slice(0, 8));
        paletteEntries.push(
          ...result.notes.map((note) => ({
            label: note.title,
            href: note.href,
            meta: `${note.category} | ${note.readTime}`,
            type: "Note",
            search: `${note.title} ${note.category} ${note.searchText}`.toLowerCase()
          }))
        );
        refreshPalette(paletteInput.value);
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
