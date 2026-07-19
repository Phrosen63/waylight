function openTab(path) {
  if (!state.openTabs.includes(path)) {
    state.openTabs.push(path);
  }
  state.activePath = path;
  renderTabs();
  renderContent();
  renderLinkPane();
  refreshTreeActiveState();
}

function closeTab(path, event) {
  if (event) event.stopPropagation();
  const idx = state.openTabs.indexOf(path);
  if (idx === -1) return;

  state.closedTabsHistory.push({ path, index: idx });

  state.openTabs.splice(idx, 1);

  if (state.activePath === path) {
    if (state.openTabs.length > 0) {
      state.activePath = state.openTabs[Math.max(0, idx - 1)];
    } else {
      state.activePath = null;
    }
  }
  renderTabs();
  renderContent();
  renderLinkPane();
  refreshTreeActiveState();
  updateUndoButtonState();
}

function undoCloseTab() {
  while (state.closedTabsHistory.length > 0) {
    const { path, index } = state.closedTabsHistory.pop();

    if (!state.files.has(path)) continue; // file gone, skip this entry
    if (state.openTabs.includes(path)) continue; // already reopened some other way

    const insertAt = Math.min(index, state.openTabs.length);
    state.openTabs.splice(insertAt, 0, path);
    state.activePath = path;

    renderTabs();
    renderContent();
    renderLinkPane();
    refreshTreeActiveState();
    updateUndoButtonState();
    return;
  }
  updateUndoButtonState(); // history exhausted, ensure button reflects disabled state
}

function updateUndoButtonState() {
  const btn = document.getElementById('undo-btn');
  if (btn) btn.disabled = state.closedTabsHistory.length === 0;
}

function renderTabs() {
  const bar = document.getElementById('tabbar');
  bar.innerHTML = '';
  state.openTabs.forEach((path) => {
    const tab = document.createElement('div');
    tab.className = 'tab' + (path === state.activePath ? ' active' : '');
    const type = getType(path);
    tab.innerHTML = `<span class="type-icon">${iconFor(type)}</span> ${getDisplayName(path)} <span class="tab-close">✕</span>`;
    tab.addEventListener('click', () => openTab(path));
    tab.querySelector('.tab-close').addEventListener('click', (e) => closeTab(path, e));

    tab.addEventListener('mousedown', (e) => {
      if (e.button === 1) e.preventDefault();
    });
    tab.addEventListener('auxclick', (e) => {
      if (e.button === 1) closeTab(path, e);
    });

    bar.appendChild(tab);
  });
}
