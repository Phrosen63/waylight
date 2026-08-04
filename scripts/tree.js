const collapsedSections = new Set();

const FOLDER_ORDER = ['platser', 'regler', 'klasser', 'monster', 'karaktarer', 'foremal'];
const FOLDER_LABELS = {
  platser: 'Platser',
  regler: 'Regler',
  klasser: 'Klasser',
  monster: 'Monster',
  karaktarer: 'Karaktärer',
  foremal: 'Föremål',
};

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function buildFolderTree(paths, skipSegments) {
  const root = { files: [], folders: {} };

  paths.forEach((path) => {
    const parts = path.split('/').slice(skipSegments); // resten efter skip-prefixet
    const folderParts = parts.slice(0, -1); // alla mappsegment, utan filnamnet
    let node = root;
    folderParts.forEach((folderName) => {
      if (!node.folders[folderName]) {
        node.folders[folderName] = { files: [], folders: {} };
      }
      node = node.folders[folderName];
    });
    node.files.push(path);
  });

  return root;
}

function renderFolderNode(node, container, sectionIdPrefix, isSearching, depth = 0) {
  const orderedFolderNames =
    depth === 0
      ? [
          ...FOLDER_ORDER.filter((f) => node.folders[f]),
          ...Object.keys(node.folders)
            .filter((f) => !FOLDER_ORDER.includes(f))
            .sort(),
        ]
      : Object.keys(node.folders).sort();

  orderedFolderNames.forEach((folderName) => {
    const childNode = node.folders[folderName];
    const subSectionId = `${sectionIdPrefix}:${folderName}`;
    const isCollapsed = isSearching ? false : collapsedSections.has(subSectionId);

    const labelEl = document.createElement('div');
    const labelClass = depth === 0 ? 'tree-folder tree-folder-fixed' : 'tree-folder tree-folder-sub';
    labelEl.className = labelClass + (isCollapsed ? ' collapsed' : '');
    const labelText =
      depth === 0 ? FOLDER_LABELS[folderName] || capitalize(folderName) : capitalize(folderName);
    labelEl.innerHTML = `<span class="chevron">▾</span> ${labelText}`;

    const nested = document.createElement('div');
    nested.className = 'tree-nested' + (isCollapsed ? ' collapsed' : '');

    renderFolderNode(childNode, nested, subSectionId, isSearching, depth + 1);
    childNode.files.sort().forEach((path) => nested.appendChild(makeTreeItem(path)));

    labelEl.addEventListener('click', (e) => {
      e.stopPropagation();
      const nowCollapsed = labelEl.classList.toggle('collapsed');
      nested.classList.toggle('collapsed');
      if (nowCollapsed) collapsedSections.add(subSectionId);
      else collapsedSections.delete(subSectionId);
    });

    container.appendChild(labelEl);
    container.appendChild(nested);
  });
}

function folderNodeHasAnyFiles(node) {
  if (node.files.length > 0) return true;
  return Object.values(node.folders).some(folderNodeHasAnyFiles);
}

function buildTree() {
  const pane = document.getElementById('tree-pane');
  pane.innerHTML = '';

  const searchWrap = document.createElement('div');
  searchWrap.className = 'tree-search-wrap';
  searchWrap.innerHTML = `
    <div class="search-input-group">
      <input type="text" id="tree-search" class="tree-search" placeholder="Sök sidor…" autocomplete="off">
      <button class="search-clear-btn" id="tree-search-clear" title="Rensa sökning" aria-label="Rensa sökning">✕</button>
    </div>
  `;
  pane.appendChild(searchWrap);

  const treeBody = document.createElement('div');
  treeBody.className = 'tree-body';
  treeBody.id = 'tree-body';
  pane.appendChild(treeBody);

  renderTreeBody(treeBody, '');

  const treeSearchInput = document.getElementById('tree-search');
  const treeSearchClear = document.getElementById('tree-search-clear');

  treeSearchInput.addEventListener('input', (e) => {
    renderTreeBody(treeBody, e.target.value.trim().toLowerCase());
    treeSearchClear.classList.toggle('visible', e.target.value.length > 0);
  });

  treeSearchClear.addEventListener('click', () => {
    treeSearchInput.value = '';
    treeSearchInput.focus();
    renderTreeBody(treeBody, '');
    treeSearchClear.classList.remove('visible');
  });
}

function fileMatchesQuery(path, file, query) {
  if (!query) return true;
  const filename = path
    .split('/')
    .pop()
    .replace(/\.(md|yaml)$/, '');
  const namn = file.frontmatter?.namn || '';
  const taggar = (file.frontmatter?.taggar || []).join(' ');
  const haystack = `${filename} ${namn} ${taggar}`.toLowerCase();
  return haystack.includes(query);
}

function renderTreeBody(treeBody, query) {
  treeBody.innerHTML = '';
  const isSearching = query.length > 0;

  const globalFolders = {}; // topLevelFolderName -> paths[]
  const adventures = {}; // advKey -> paths[]

  for (const [path, file] of state.files) {
    if (file.isProject) continue;
    if (path === EXAMPLE_PAGE_PATH) continue;
    if (!fileMatchesQuery(path, file, query)) continue;

    const parts = path.split('/');
    if (parts[0] === 'aventyr') {
      const advKey = parts[1];
      if (!adventures[advKey]) adventures[advKey] = [];
      adventures[advKey].push(path);
    } else {
      if (!globalFolders[parts[0]]) globalFolders[parts[0]] = [];
      globalFolders[parts[0]].push(path);
    }
  }

  const orderedFolderKeys = [
    ...FOLDER_ORDER.filter((f) => globalFolders[f]),
    ...Object.keys(globalFolders).filter((f) => !FOLDER_ORDER.includes(f)), // any unexpected folders, appended
  ];

  for (const folder of orderedFolderKeys) {
    const sectionId = `global:${folder}`;
    const isCollapsed = isSearching ? false : collapsedSections.has(sectionId);

    const section = document.createElement('div');
    section.className = 'tree-section';

    const labelEl = document.createElement('div');
    labelEl.className = 'tree-folder tree-folder-fixed' + (isCollapsed ? ' collapsed' : '');
    labelEl.innerHTML = `<span class="chevron">▾</span> ${FOLDER_LABELS[folder] || folder}`;

    const nested = document.createElement('div');
    nested.className = 'tree-nested' + (isCollapsed ? ' collapsed' : '');

    const folderTree = buildFolderTree(globalFolders[folder], 1);
    renderFolderNode(folderTree, nested, sectionId, isSearching, 0);
    folderTree.files.sort().forEach((path) => nested.appendChild(makeTreeItem(path)));

    labelEl.addEventListener('click', () => {
      const nowCollapsed = labelEl.classList.toggle('collapsed');
      nested.classList.toggle('collapsed');
      if (nowCollapsed) collapsedSections.add(sectionId);
      else collapsedSections.delete(sectionId);
    });

    section.appendChild(labelEl);
    section.appendChild(nested);
    treeBody.appendChild(section);
  }

  const advKeys =
    Object.keys(adventures).length > 0
      ? Object.keys(adventures)
      : Object.keys(state.adventureFilePaths || {}); // adventures whose content hasn't been fetched yet still need to show up

  if (advKeys.length > 0 || !isSearching) {
    const advSection = document.createElement('div');
    advSection.className = 'tree-section';
    advSection.innerHTML = `<div class="tree-section-label">Äventyr</div>`;

    for (const advKey of advKeys) {
      const sectionId = `aventyr:${advKey}`;
      const projectPath = `aventyr/${advKey}/aventyr.yaml`;
      const projectFile = state.files.get(projectPath);
      const title = projectFile?.data?.namn || advKey;

      const hasUnfetchedContent = (state.adventureFilePaths?.[advKey]?.length || 0) > 0;

      if (hasUnfetchedContent && !isUnlocked()) {
        // Låst och oupplåst — visa lås-raden, trigga upplåsning vid klick
        if (isSearching) continue; // can't search content we haven't fetched
        const lockedRow = document.createElement('div');
        lockedRow.className = 'tree-folder tree-adventure-locked';
        lockedRow.innerHTML = `<span class="lock-icon">🔒</span> ${title}`;
        lockedRow.addEventListener('click', async () => {
          const success = await promptForPassword();
          if (success) {
            refreshForLockStateChange();
            await ensureAdventureLoaded(advKey);
          }
        });
        advSection.appendChild(lockedRow);
        continue;
      }

      if (hasUnfetchedContent && isUnlocked()) {
        if (!isSearching) {
          const loadingRow = document.createElement('div');
          loadingRow.className = 'tree-folder tree-adventure-locked';
          loadingRow.innerHTML = `<span class="lock-icon">⏳</span> ${title}`;
          advSection.appendChild(loadingRow);
        }
        ensureAdventureLoaded(advKey);
        continue;
      }

      const isCollapsed = isSearching ? false : collapsedSections.has(sectionId);

      const folderEl = document.createElement('div');
      folderEl.className = 'tree-folder' + (isCollapsed ? ' collapsed' : '');
      folderEl.innerHTML = `<span class="chevron">▾</span> ${title}`;

      const nested = document.createElement('div');
      nested.className = 'tree-nested' + (isCollapsed ? ' collapsed' : '');

      const folderTree = buildFolderTree(adventures[advKey] || [], 2);
      renderFolderNode(folderTree, nested, sectionId, isSearching, 0);
      folderTree.files.sort().forEach((path) => nested.appendChild(makeTreeItem(path)));

      folderEl.addEventListener('click', () => {
        const nowCollapsed = folderEl.classList.toggle('collapsed');
        nested.classList.toggle('collapsed');
        if (nowCollapsed) collapsedSections.add(sectionId);
        else collapsedSections.delete(sectionId);
      });

      advSection.appendChild(folderEl);
      advSection.appendChild(nested);
    }
    treeBody.appendChild(advSection);
  }

  if (isSearching && orderedFolderKeys.length === 0 && advKeys.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'tree-search-empty';
    empty.textContent = 'Inga träffar.';
    treeBody.appendChild(empty);
  }
}

const pendingAdventureLoads = new Set(); // advKeys currently being fetched, to avoid duplicate parallel loads

async function ensureAdventureLoaded(advKey) {
  const hasUnfetchedContent = (state.adventureFilePaths?.[advKey]?.length || 0) > 0;
  if (!hasUnfetchedContent) return;
  if (pendingAdventureLoads.has(advKey)) return; // already in flight, let that call finish and re-render

  pendingAdventureLoads.add(advKey);
  try {
    const result = await loadAdventureContent(advKey, state.isForceRefreshing);
    if (!result.ok) {
      console.warn(`Waylight: kunde inte läsa in äventyret ${advKey}:`, result.detail);
    }
    buildTree(); // re-render now that content is available
  } finally {
    pendingAdventureLoads.delete(advKey);
  }
}

function makeTreeItem(path) {
  const el = document.createElement('div');
  const file = state.files.get(path);
  const isConfidential = isConfidentialFile(path, file);
  const showsAsLocked = isConfidential && !isUnlocked() && !isRevealedViaUrl(path);

  el.className = 'tree-item' + (showsAsLocked ? ' tree-item-confidential' : '');
  el.dataset.path = path;
  const type = getType(path);
  const icon = showsAsLocked ? '🔒' : iconFor(type);
  el.innerHTML = `<span class="type-icon">${icon}</span> ${getDisplayName(path)}`;
  el.addEventListener('click', () => {
    openTab(path);
    if (isMobileLayout()) closeAllMobilePanes();
  });
  return el;
}

function refreshTreeActiveState() {
  document.querySelectorAll('.tree-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.path === state.activePath);
  });
}
