(function () {
  const DEFAULT_CONFIG = {
    siteName: "Verdant Notes",
    siteShortName: "VN",
    owner: "SilkRush",
    repo: "Notes",
    notesFolder: "notes",
    includeGitHubDiscovery: true
  };

  function getConfig() {
    return Object.assign({}, DEFAULT_CONFIG, window.NOTES_SITE_CONFIG || {});
  }

  function resolveFromRoot(rootPath, path) {
    const cleanPath = String(path || "").replace(/^\/+/, "");
    const cleanRoot = String(rootPath || ".").replace(/\/+$/, "") || ".";
    return cleanRoot === "." ? `./${cleanPath}` : `${cleanRoot}/${cleanPath}`;
  }

  function formatTitle(fileName) {
    const replacements = {
      sql: "SQL",
      regex: "Regex",
      cpp: "C++",
      js: "JS",
      html: "HTML",
      css: "CSS",
      api: "API"
    };

    return String(fileName || "")
      .replace(/\.html?$/i, "")
      .split(/[-_]+/)
      .filter(Boolean)
      .map((part) => {
        const lower = part.toLowerCase();
        if (replacements[lower]) {
          return replacements[lower];
        }

        return lower.charAt(0).toUpperCase() + lower.slice(1);
      })
      .join(" ");
  }

  function inferCategory(fileName) {
    const value = String(fileName || "").toLowerCase();

    if (value.includes("sql")) {
      return "Database";
    }

    if (value.includes("regex")) {
      return "Pattern Matching";
    }

    if (value.includes("cpp") || value.includes("c++")) {
      return "Programming";
    }

    return "Reference";
  }

  function buildSummary(title, category) {
    const copy = {
      Database: "Query patterns, schema work, joins, and practical database study in one page.",
      "Pattern Matching": "Rules, syntax, matching examples, and study-friendly pattern breakdowns.",
      Programming: "Concepts, examples, and practical language notes in a structured guide.",
      Reference: "A focused study note with examples, headings, and quick revision value."
    };

    return copy[category] || `Open ${title} as a focused reference note.`;
  }

  function uniqueStrings(items) {
    return Array.from(new Set((items || []).filter(Boolean)));
  }

  function normalizeManifestEntries(entries) {
    return Array.isArray(entries) ? entries : [];
  }

  async function loadGitHubCatalog(config) {
    if (!config.includeGitHubDiscovery || !config.owner || !config.repo) {
      return { entries: [], error: null };
    }

    const apiURL = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.notesFolder}`;

    try {
      const response = await fetch(apiURL, {
        headers: {
          Accept: "application/vnd.github+json"
        }
      });

      if (!response.ok) {
        throw new Error(`GitHub returned ${response.status}`);
      }

      const payload = await response.json();
      const entries = payload
        .filter((item) => item.type === "file" && /\.html?$/i.test(item.name))
        .map((item) => ({
          fileName: item.name
        }));

      return { entries, error: null };
    } catch (error) {
      return { entries: [], error };
    }
  }

  async function loadNotesCatalog(options) {
    const settings = options || {};
    const rootPath = settings.rootPath || ".";
    const config = getConfig();
    const manifestEntries = normalizeManifestEntries(window.NOTES_MANIFEST);
    const remote = await loadGitHubCatalog(config);

    const fileNames = new Set();
    manifestEntries.forEach((entry) => fileNames.add(entry.fileName));
    remote.entries.forEach((entry) => fileNames.add(entry.fileName));

    const manifestMap = new Map(
      manifestEntries.map((entry) => [entry.fileName, entry])
    );

    const notes = Array.from(fileNames)
      .filter(Boolean)
      .map((fileName) => {
        const manifest = manifestMap.get(fileName) || {};
        const title = manifest.title || formatTitle(fileName);
        const category = manifest.category || inferCategory(fileName);
        const tags = uniqueStrings([].concat(manifest.tags || [], category));

        return {
          fileName,
          title,
          category,
          summary: manifest.summary || buildSummary(title, category),
          tags,
          level: manifest.level || "Reference",
          readTime: manifest.readTime || "Quick read",
          updated: manifest.updated || (remote.entries.length ? "Repo tracked" : "Manifest"),
          featured: Boolean(manifest.featured),
          order: Number.isFinite(manifest.order) ? manifest.order : 999,
          directHref: resolveFromRoot(rootPath, `${config.notesFolder}/${encodeURIComponent(fileName)}`),
          href: resolveFromRoot(rootPath, `viewer.html?note=${encodeURIComponent(fileName)}`),
          searchText: [
            fileName,
            title,
            category,
            manifest.summary || "",
            tags.join(" "),
            manifest.level || ""
          ]
            .join(" ")
            .toLowerCase()
        };
      })
      .sort((left, right) => {
        const orderDiff = left.order - right.order;
        if (orderDiff !== 0) {
          return orderDiff;
        }

        if (left.featured !== right.featured) {
          return Number(right.featured) - Number(left.featured);
        }

        return left.title.localeCompare(right.title);
      });

    let source = "Starter fallback";
    if (remote.entries.length && manifestEntries.length) {
      source = "GitHub + manifest";
    } else if (remote.entries.length) {
      source = "GitHub catalog";
    } else if (manifestEntries.length) {
      source = "Manifest fallback";
    }

    return {
      config,
      notes,
      source,
      error: remote.error
    };
  }

  window.NotesSiteData = {
    getConfig,
    loadNotesCatalog,
    formatTitle,
    inferCategory,
    resolveFromRoot
  };
})();
