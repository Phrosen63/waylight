function showLoadingScreen(message) {
  const scroll = document.getElementById('content-scroll');
  scroll.innerHTML = `
    <div class="welcome">
      <div class="glyph-lg spin">◈</div>
      <h2>Läser in waypoints…</h2>
      <p>${message || 'Hämtar filträd och innehåll från GitHub.'}</p>
    </div>`;
}

function showErrorScreen(detail, errorList) {
  const scroll = document.getElementById('content-scroll');
  const listHtml =
    errorList && errorList.length
      ? `<div class="error-detail-list">${errorList
          .slice(0, 8)
          .map((e) => `<div>${e}</div>`)
          .join(
            '',
          )}${errorList.length > 8 ? `<div>…och ${errorList.length - 8} till.</div>` : ''}</div>`
      : '';
  scroll.innerHTML = `
    <div class="welcome">
      <div class="glyph-lg">⚠</div>
      <h2>Kunde inte läsa in waypoints</h2>
      <p>${detail}</p>
      ${listHtml}
      <button class="retry-btn" id="retry-load">Försök igen</button>
    </div>`;
  document.getElementById('retry-load').addEventListener('click', () => loadAndRender(true));
}

async function init() {
  initResponsivePanes();
  initPageSearch();
  initMasterLock();
  document.getElementById('refresh-btn').addEventListener('click', () => loadAndRender(true));
  document.getElementById('undo-btn').addEventListener('click', undoCloseTab);
  initUndoKeyboardShortcut();
  await loadAndRender(false);
}

function initUndoKeyboardShortcut() {
  document.addEventListener('keydown', (e) => {
    const isUndoCombo = (e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z';
    if (!isUndoCombo) return;

    const tag = document.activeElement?.tagName;
    const isEditableFocus =
      tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable;
    if (isEditableFocus) return;

    e.preventDefault();
    undoCloseTab();
  });
}

async function loadAndRender(forceRefresh) {
  showLoadingScreen();

  const result = await loadFromGitHub((done, total) => {
    showLoadingScreen(`Hämtat ${done} av ${total} filer…`);
  }, forceRefresh);

  if (!result.ok) {
    showErrorScreen(result.detail, state.loadErrors);
    document.getElementById('status-pill').textContent = 'fel vid inläsning';
    return;
  }

  const statusPill = document.getElementById('status-pill');
  if (result.fromCache) {
    const age = Math.round((Date.now() - result.cachedAt) / 60000);
    statusPill.textContent = age < 1 ? 'från cache' : `från cache (${age} min)`;
  } else {
    statusPill.textContent =
      state.loadErrors.length > 0
        ? `inläst (${state.loadErrors.length} varningar)`
        : 'inläst från GitHub';
  }

  buildTree();
  renderContent();
  renderLinkPane();

  if (state.loadErrors.length > 0) {
    console.warn('Waylight: fel vid inläsning av vissa filer:', state.loadErrors);
  }

  checkForNameCollisions();
}

function checkForNameCollisions() {
  const collisions = detectNameCollisions();
  if (collisions.length === 0) return;

  console.warn(`Waylight: ${collisions.length} filnamnskrock(ar) upptäckta:`, collisions);

  const banner = document.createElement('div');
  banner.className = 'collision-banner';
  const itemsHtml = collisions
    .map((c) => {
      const scopeLabel = c.scope.startsWith('aventyr:')
        ? `äventyret "${c.scope.slice(8)}"`
        : `mappen "${c.scope.slice(7)}"`;
      const pathsHtml = c.paths.map((p) => `<code>${p}</code>`).join(', ');
      return `<div class="collision-item">Namnet <strong>${c.name}</strong> används av flera filer i ${scopeLabel}: ${pathsHtml}</div>`;
    })
    .join('');

  banner.innerHTML = `
    <div class="collision-banner-header">
      <span>⚠ ${collisions.length} filnamnskrock${collisions.length > 1 ? 'ar' : ''} upptäckt${collisions.length > 1 ? 'a' : ''} — länkar till dessa namn kan peka fel</span>
      <button class="collision-banner-dismiss" title="Stäng">✕</button>
    </div>
    <div class="collision-banner-body">${itemsHtml}</div>
  `;
  banner
    .querySelector('.collision-banner-dismiss')
    .addEventListener('click', () => banner.remove());

  document.body.appendChild(banner);
}

document.addEventListener('DOMContentLoaded', init);
