const URL_STATE_DEBOUNCE_MS = 300;

let urlStateWriteTimer = null;

function readUrlState() {
  const params = new URLSearchParams(window.location.search);

  const tabsParam = params.get('tabs');
  const tabs = tabsParam
    ? tabsParam
        .split(',')
        .map((p) => decodeURIComponent(p.trim()))
        .filter(Boolean)
    : [];

  const activeParam = params.get('active');
  const active = activeParam ? decodeURIComponent(activeParam) : null;

  const search = params.get('search') || '';
  const pageSearch = params.get('page_search') || '';

  return { tabs, active, search, pageSearch };
}

function writeUrlStateNow() {
  const params = new URLSearchParams();

  if (state.openTabs.length > 0) {
    params.set('tabs', state.openTabs.map((p) => encodeURIComponent(p)).join(','));
  }

  if (state.activePath) {
    params.set('active', encodeURIComponent(state.activePath));
  }

  const treeSearchInput = document.getElementById('tree-search');
  const searchTerm = treeSearchInput ? treeSearchInput.value.trim() : '';
  if (searchTerm) {
    params.set('search', searchTerm);
  }

  const pageSearchInput = document.getElementById('page-search');
  const pageSearchTerm = pageSearchInput ? pageSearchInput.value.trim() : '';
  if (pageSearchTerm) {
    params.set('page_search', pageSearchTerm);
  }

  const queryString = params.toString();
  const newUrl =
    window.location.pathname + (queryString ? `?${queryString}` : '') + window.location.hash;

  history.replaceState(null, '', newUrl);
}

function scheduleUrlStateWrite() {
  if (urlStateWriteTimer) clearTimeout(urlStateWriteTimer);
  urlStateWriteTimer = setTimeout(writeUrlStateNow, URL_STATE_DEBOUNCE_MS);
}

async function applyUrlState(urlState) {
  if (!urlState.tabs.length && !urlState.active && !urlState.search) return;

  const touchedAdventures = new Set();
  urlState.tabs.forEach((path) => {
    if (path.startsWith('aventyr/')) {
      touchedAdventures.add(path.split('/')[1]);
    }
  });
  if (urlState.active && urlState.active.startsWith('aventyr/')) {
    touchedAdventures.add(urlState.active.split('/')[1]);
  }

  for (const advKey of touchedAdventures) {
    const hasUnfetchedContent = (state.adventureFilePaths?.[advKey]?.length || 0) > 0;
    if (hasUnfetchedContent && isUnlocked()) {
      await ensureAdventureLoaded(advKey);
    }
  }

  const validPaths = urlState.tabs.filter((path) => state.files.has(path));

  validPaths.forEach((path) => {
    if (!state.openTabs.includes(path)) {
      state.openTabs.push(path);
    }
  });

  if (urlState.active && state.files.has(urlState.active)) {
    state.activePath = urlState.active;
  } else if (validPaths.length > 0) {
    state.activePath = validPaths[validPaths.length - 1];
  }

  if (urlState.search) {
    const treeSearchInput = document.getElementById('tree-search');
    const treeSearchClear = document.getElementById('tree-search-clear');
    const treeBody = document.getElementById('tree-body');
    if (treeSearchInput) {
      treeSearchInput.value = urlState.search;
      treeSearchClear?.classList.toggle('visible', urlState.search.length > 0);
    }
    if (treeBody) {
      renderTreeBody(treeBody, urlState.search.trim().toLowerCase());
    }
  }

  if (validPaths.length > 0 || (urlState.active && state.activePath === urlState.active)) {
    renderTabs();
    renderContent();
    renderLinkPane();
    refreshTreeActiveState();
    updateUndoButtonState();
  }

  if (urlState.pageSearch && state.activePath) {
    const pageSearchInput = document.getElementById('page-search');
    const pageSearchClear = document.getElementById('page-search-clear');
    if (pageSearchInput) {
      pageSearchInput.value = urlState.pageSearch;
      pageSearchClear?.classList.add('visible');
      runPageSearch(urlState.pageSearch);
    }

    const wrap = document.getElementById('page-search-wrap');
    const toggleBtn = document.getElementById('toggle-page-search');
    if (wrap && !wrap.classList.contains('open') && isMobileLayout?.()) {
      wrap.classList.add('open');
      toggleBtn?.classList.add('active');
    }
  }
}

function initUrlStateSync() {
  const treePane = document.getElementById('tree-pane');
  if (treePane) {
    treePane.addEventListener('input', (e) => {
      if (e.target && e.target.id === 'tree-search') {
        scheduleUrlStateWrite();
      }
    });
  }

  const pageSearchInput = document.getElementById('page-search');
  if (pageSearchInput) {
    pageSearchInput.addEventListener('input', scheduleUrlStateWrite);
  }
}
