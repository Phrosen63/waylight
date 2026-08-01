function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[åä]/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function normalizeTocLevels(rawValue) {
  const DEFAULT_LEVELS = [2];
  if (!Array.isArray(rawValue) || rawValue.length === 0) return DEFAULT_LEVELS;

  const validLevels = [...new Set(rawValue)]
    .map((n) => Number(n))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 6)
    .sort((a, b) => a - b);

  return validLevels.length > 0 ? validLevels : DEFAULT_LEVELS;
}

function extractTocFromHtml(html, levels) {
  const container = document.createElement('div');
  container.innerHTML = html;

  const selector = levels.map((l) => `h${l}`).join(', ');
  const headingEls = container.querySelectorAll(selector);

  const seenSlugs = new Map();
  const root = []; // toppnivå-entries (lägsta numeriska nivån i `levels`, t.ex. H2 om levels=[2,3])
  const stack = []; // stack av { level, node } för att hitta rätt förälder

  headingEls.forEach((el) => {
    const level = parseInt(el.tagName.slice(1), 10); // "H2" -> 2
    const text = el.textContent.trim();
    let slug = slugify(text) || 'sektion';
    const count = seenSlugs.get(slug) || 0;
    seenSlugs.set(slug, count + 1);
    if (count > 0) slug = `${slug}-${count + 1}`;

    el.id = slug;
    const node = { id: slug, text, level, children: [] };

    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }

    if (stack.length === 0) {
      root.push(node);
    } else {
      stack[stack.length - 1].node.children.push(node);
    }
    stack.push({ level, node });
  });

  return { html: container.innerHTML, tocEntries: root };
}

function renderTocEntries(entries) {
  return entries
    .map((entry) => {
      const childrenHtml =
        entry.children.length > 0
          ? `<ul class="doc-toc-list">${renderTocEntries(entry.children)}</ul>`
          : '';
      return `<li><a href="#" class="toc-link" data-anchor="${entry.id}">${entry.text}</a>${childrenHtml}</li>`;
    })
    .join('');
}

function renderTocHtml(tocEntries) {
  if (tocEntries.length === 0) return '';
  return `
    <nav class="doc-toc">
      <div class="doc-toc-title">Innehåll</div>
      <ul class="doc-toc-list">${renderTocEntries(tocEntries)}</ul>
    </nav>`;
}

function buildRevealUrl(path) {
  const params = new URLSearchParams();
  params.set('tabs', path);
  params.set('active', path);
  params.set('reveal', path);
  return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
}

function renderShareButtonHtml() {
  return `
    <button class="share-reveal-btn" id="share-reveal-btn" title="Kopiera en länk som visar den här sidan olåst, utan att låsa upp resten av äventyret">
      <span class="btn-icon">🔗</span>
      <span class="btn-label">Kopiera delningslänk</span>
    </button>`;
}

function attachShareButtonHandler(path) {
  const btn = document.getElementById('share-reveal-btn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const url = buildRevealUrl(path);
    try {
      await navigator.clipboard.writeText(url);
      const label = btn.querySelector('.btn-label');
      const original = label.textContent;
      label.textContent = 'Länk kopierad!';
      btn.classList.add('copied');
      setTimeout(() => {
        label.textContent = original;
        btn.classList.remove('copied');
      }, 2000);
    } catch (e) {
      console.warn('Waylight: kunde inte kopiera länken automatiskt.', e);
      window.prompt('Kopiera länken manuellt:', url);
    }
  });
}

function renderContent() {
  const scroll = document.getElementById('content-scroll');
  const projectNameEl = document.getElementById('project-name');

  if (!state.activePath) {
    scroll.innerHTML = `
      <div class="welcome">
        <div class="glyph-lg">◈</div>
        <h2>Ingen sida öppen</h2>
        <p>Välj en fil i trädet till vänster för att börja bläddra i ditt äventyr.</p>
      </div>`;
    if (typeof updateScrollTopButtonVisibility === 'function') {
      updateScrollTopButtonVisibility();
    }
    return;
  }

  const file = state.files.get(state.activePath);
  if (!file) return;

  const parts = state.activePath.split('/');
  if (parts[0] === 'aventyr') {
    projectNameEl.textContent =
      state.files.get(`${parts[0]}/${parts[1]}/aventyr.yaml`)?.data?.namn || parts[1];
  } else {
    projectNameEl.textContent = 'Globalt innehåll';
  }

  const isConfidential = isConfidentialFile(state.activePath, file);
  const isUnlockedForThisPage = isUnlocked() || isRevealedViaUrl(state.activePath);

  if (isConfidential && !isUnlockedForThisPage) {
    scroll.innerHTML = `
      <div class="content-inner">
        <div class="doc-type-badge">${iconFor(file.frontmatter?.type)} ${file.frontmatter?.type || 'sida'}</div>
        <h1 class="doc-title">${getDisplayName(state.activePath)}</h1>
        <div class="confidential-lock-notice">
          <div class="confidential-lock-icon">🔒</div>
          <div class="confidential-lock-text">Det här innehållet är låst.<br>Lås upp för att visa sidan.</div>
        </div>
      </div>`;
    resetPageSearch();
    return;
  }

  const isDraft = file.frontmatter?.status === 'draft';
  let html = renderMarkdown(file);

  let tocHtml = '';
  if (file.frontmatter?.toc === true) {
    const tocLevels = normalizeTocLevels(file.frontmatter?.toc_nivaer);
    const extracted = extractTocFromHtml(html, tocLevels);
    html = extracted.html;
    tocHtml = renderTocHtml(extracted.tocEntries);
  }

  const shareButtonHtml =
    isShareable(state.activePath) && isUnlocked() ? renderShareButtonHtml() : '';

  scroll.innerHTML = `
    <div class="content-inner">
      <div class="doc-type-badge">${iconFor(file.frontmatter?.type)} ${file.frontmatter?.type || 'sida'}${isDraft ? '<span class="draft-badge">✎ utkast</span>' : ''}</div>
      <h1 class="doc-title">${file.frontmatter?.namn || getDisplayName(state.activePath)}</h1>
      ${shareButtonHtml}
      ${tocHtml}
      <div class="doc-body">${html}</div>
    </div>`;

  if (isShareable(state.activePath) && isUnlocked()) {
    attachShareButtonHandler(state.activePath);
  }

  scroll.querySelectorAll('.internal-link').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      openTab(a.dataset.path);
    });
  });

  scroll.querySelectorAll('.toc-link').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.getElementById(a.dataset.anchor);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  scroll.querySelectorAll('.wikilink-locked').forEach((el) => {
    el.addEventListener('click', async () => {
      const success = await promptForPassword();
      if (!success) return;
      refreshForLockStateChange();
      const advKey = el.dataset.lockedAdventure;
      await ensureAdventureLoaded(advKey);
      const targetPath = resolveLink(el.dataset.lockedKey, state.activePath);
      if (typeof targetPath === 'string') {
        openTab(targetPath);
      }
    });
  });

  resetPageSearch();

  if (typeof updateScrollTopButtonVisibility === 'function') {
    updateScrollTopButtonVisibility();
  }
}
