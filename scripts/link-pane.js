function findBacklinks(targetPath) {
  const backlinks = [];
  for (const [path, file] of state.files) {
    if (path === targetPath || file.isProject) continue;
    const links = file.frontmatter?.länkar || {};
    for (const category of Object.values(links)) {
      if (!Array.isArray(category)) continue;
      for (const key of category) {
        if (resolveLink(key, path) === targetPath) {
          backlinks.push(path);
        }
      }
    }
  }
  return [...new Set(backlinks)];
}

function renderLinkPane() {
  const pane = document.getElementById('link-pane');
  pane.innerHTML = '';

  if (!state.activePath) {
    pane.innerHTML = `<div class="link-section"><div class="link-empty">Inget valt</div></div>`;
    return;
  }

  const file = state.files.get(state.activePath);
  const links = file.frontmatter?.länkar || {};
  const related = file.frontmatter?.relaterat || [];
  const backlinks = findBacklinks(state.activePath);

  const linksSection = document.createElement('div');
  linksSection.className = 'link-section';
  let linksHtml = `<div class="link-section-title">⤷ Länkar på denna sida</div>`;
  const hasAnyLinks = Object.values(links).some((arr) => Array.isArray(arr) && arr.length > 0);

  if (!hasAnyLinks) {
    linksHtml += `<div class="link-empty">Inga explicita länkar</div>`;
  } else {
    for (const [category, keys] of Object.entries(links)) {
      if (!Array.isArray(keys) || keys.length === 0) continue;
      linksHtml += `<div class="link-group"><div class="link-group-label">${category}</div>`;
      keys.forEach((key) => {
        const resolved = resolveLink(key, state.activePath);
        if (resolved) {
          linksHtml += chipHtml(resolved);
        } else {
          linksHtml += `<div class="link-chip" style="color:var(--danger); cursor:default;">⚠ ${key} (saknas)</div>`;
        }
      });
      linksHtml += `</div>`;
    }
  }
  linksSection.innerHTML = linksHtml;
  pane.appendChild(linksSection);

  pane.appendChild(divider());

  const relatedSection = document.createElement('div');
  relatedSection.className = 'link-section';
  let relatedHtml = `<div class="link-section-title">≈ Relaterat</div>`;
  if (related.length === 0) {
    relatedHtml += `<div class="link-empty">Inget angivet</div>`;
  } else {
    related.forEach((key) => {
      const resolved = resolveLink(key, state.activePath);
      relatedHtml += resolved
        ? chipHtml(resolved)
        : `<div class="link-chip" style="color:var(--danger); cursor:default;">⚠ ${key} (saknas)</div>`;
    });
  }
  relatedSection.innerHTML = relatedHtml;
  pane.appendChild(relatedSection);

  if (backlinks.length > 0) {
    pane.appendChild(divider());
    const backSection = document.createElement('div');
    backSection.className = 'link-section';
    let backHtml = `<div class="link-section-title">↩ Omnämnd av</div>`;
    backlinks.forEach((path) => {
      backHtml += chipHtml(path);
    });
    backSection.innerHTML = backHtml;
    pane.appendChild(backSection);
  }

  pane.querySelectorAll('.link-chip[data-path]').forEach((chip) => {
    chip.addEventListener('click', () => {
      openTab(chip.dataset.path);
      if (isMobileLayout()) closeAllMobilePanes();
    });
  });
}

function chipHtml(path) {
  const type = getType(path);
  return `<div class="link-chip" data-path="${path}"><span class="type-icon">${iconFor(type)}</span> ${getDisplayName(path)}</div>`;
}

function divider() {
  const d = document.createElement('div');
  d.className = 'link-pane-divider';
  return d;
}
