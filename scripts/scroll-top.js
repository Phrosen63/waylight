const SCROLL_TOP_SHOW_THRESHOLD = 400; // px scrollat innan knappen visas

function isScrollTopButtonEnabledForActivePage() {
  if (!state.activePath) return false;
  const file = state.files.get(state.activePath);
  const setting = file?.frontmatter?.tillbaka_knapp;
  // Default PÅ om fältet saknas helt — bara explicit `false` stänger av den.
  return setting !== false;
}

function updateScrollTopButtonVisibility() {
  const btn = document.getElementById('scroll-top-btn');
  const container = document.getElementById('content-scroll');
  if (!btn || !container) return;

  if (!isScrollTopButtonEnabledForActivePage()) {
    btn.classList.remove('visible');
    return;
  }

  const shouldShow = container.scrollTop > SCROLL_TOP_SHOW_THRESHOLD;
  btn.classList.toggle('visible', shouldShow);
}

function initScrollTopButton() {
  const btn = document.getElementById('scroll-top-btn');
  const container = document.getElementById('content-scroll');
  if (!btn || !container) return;

  container.addEventListener('scroll', updateScrollTopButtonVisibility, { passive: true });

  btn.addEventListener('click', () => {
    container.scrollTo({ top: 0, behavior: 'smooth' });
  });
}
