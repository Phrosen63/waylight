const TREE_DRAWER_BREAKPOINT = 1100;
const LINK_DRAWER_BREAKPOINT = 900;

function isTreeDrawerMode() {
  return window.innerWidth <= TREE_DRAWER_BREAKPOINT;
}

function isLinkDrawerMode() {
  return window.innerWidth <= LINK_DRAWER_BREAKPOINT;
}

function isMobileLayout() {
  return isTreeDrawerMode();
}

function setPaneOpen(paneId, open) {
  const pane = document.getElementById(paneId);
  const scrim = document.getElementById('pane-scrim');
  const toggleId = paneId === 'tree-pane' ? 'toggle-tree' : 'toggle-links';
  const toggleBtn = document.getElementById(toggleId);

  pane.classList.toggle('open', open);
  toggleBtn.classList.toggle('active', open);

  if (toggleId === 'toggle-tree') {
    const labelEl = toggleBtn.querySelector('.btn-label');
    if (labelEl) labelEl.textContent = open ? 'Stäng' : 'Meny';
  }

  const anyOpen =
    document.getElementById('tree-pane').classList.contains('open') ||
    document.getElementById('link-pane').classList.contains('open');
  scrim.classList.toggle('visible', anyOpen && (isTreeDrawerMode() || isLinkDrawerMode()));
}

function toggleTreePane() {
  const isOpen = document.getElementById('tree-pane').classList.contains('open');
  if (!isOpen) setPaneOpen('link-pane', false); // only one panel open at a time on mobile
  setPaneOpen('tree-pane', !isOpen);
}

function toggleLinkPane() {
  const isOpen = document.getElementById('link-pane').classList.contains('open');
  if (!isOpen) setPaneOpen('tree-pane', false);
  setPaneOpen('link-pane', !isOpen);
}

function closeAllMobilePanes() {
  setPaneOpen('tree-pane', false);
  setPaneOpen('link-pane', false);
}

function initResponsivePanes() {
  document.getElementById('toggle-tree').addEventListener('click', toggleTreePane);
  document.getElementById('toggle-links').addEventListener('click', toggleLinkPane);
  document.getElementById('toggle-page-search').addEventListener('click', togglePageSearch);
  document.getElementById('pane-scrim').addEventListener('click', closeAllMobilePanes);

  window.addEventListener('resize', () => {
    if (!isTreeDrawerMode() && !isLinkDrawerMode()) closeAllMobilePanes();
  });
}
