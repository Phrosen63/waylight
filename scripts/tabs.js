function getScrollContainer() {
  return document.getElementById('content-scroll');
}

function saveScrollPositionFor(path) {
  if (!path) return;
  const container = getScrollContainer();
  if (!container) return;
  state.scrollPositions.set(path, container.scrollTop);
}

function openTab(path, { skipScrollRestore = false } = {}) {
  const wasAlreadyOpen = state.openTabs.includes(path);

  if (state.activePath && state.activePath !== path) {
    saveScrollPositionFor(state.activePath);
  }

  if (!wasAlreadyOpen) {
    state.openTabs.push(path);
  }
  state.activePath = path;
  renderTabs();
  renderContent();
  renderLinkPane();
  refreshTreeActiveState();
  scheduleUrlStateWrite();

  if (!skipScrollRestore) {
    const container = getScrollContainer();
    if (container) {
      if (wasAlreadyOpen && state.scrollPositions.has(path)) {
        container.scrollTop = state.scrollPositions.get(path);
      } else {
        if (!wasAlreadyOpen) {
          state.scrollPositions.delete(path);
        }
        container.scrollTop = 0;
      }
    }
  }
}

function closeTab(path, event) {
  if (event) event.stopPropagation();
  const idx = state.openTabs.indexOf(path);
  if (idx === -1) return;

  if (path === state.activePath) {
    const container = getScrollContainer();
    if (container) {
      state.closedTabScrollPositions.set(path, container.scrollTop);
    }
  }

  state.scrollPositions.delete(path);
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
  scheduleUrlStateWrite();

  const container = getScrollContainer();
  if (container) {
    if (state.activePath && state.scrollPositions.has(state.activePath)) {
      container.scrollTop = state.scrollPositions.get(state.activePath);
    } else {
      container.scrollTop = 0;
    }
  }
}

function undoCloseTab() {
  while (state.closedTabsHistory.length > 0) {
    const { path, index } = state.closedTabsHistory.pop();

    if (!state.files.has(path)) continue; // file gone, skip this entry
    if (state.openTabs.includes(path)) continue; // already reopened some other way

    const insertAt = Math.min(index, state.openTabs.length);
    state.openTabs.splice(insertAt, 0, path);

    if (state.activePath && state.activePath !== path) {
      saveScrollPositionFor(state.activePath);
    }
    state.activePath = path;

    renderTabs();
    renderContent();
    renderLinkPane();
    refreshTreeActiveState();
    updateUndoButtonState();
    scheduleUrlStateWrite();

    const container = getScrollContainer();
    if (container) {
      if (state.closedTabScrollPositions.has(path)) {
        container.scrollTop = state.closedTabScrollPositions.get(path);
        state.closedTabScrollPositions.delete(path);
      } else {
        container.scrollTop = 0;
      }
    }
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
