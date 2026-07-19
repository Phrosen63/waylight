const pageSearchState = { matches: [], activeIndex: -1 };

let cleanDocBodyHtml = null;

function resetPageSearch() {
  pageSearchState.matches = [];
  pageSearchState.activeIndex = -1;
  cleanDocBodyHtml = null;
  const input = document.getElementById('page-search');
  const clearBtn = document.getElementById('page-search-clear');
  if (input) input.value = '';
  if (clearBtn) clearBtn.classList.remove('visible');
  updatePageSearchCount();

  const wrap = document.getElementById('page-search-wrap');
  const btn = document.getElementById('toggle-page-search');
  if (wrap && wrap.classList.contains('open')) {
    wrap.classList.remove('open');
    btn.classList.remove('active');
  }
}

function runPageSearch(query) {
  const docBody = document.querySelector('.doc-body');
  if (!docBody) return;

  if (cleanDocBodyHtml === null) {
    cleanDocBodyHtml = docBody.innerHTML;
  }

  if (!query) {
    docBody.innerHTML = cleanDocBodyHtml;
    pageSearchState.matches = [];
    pageSearchState.activeIndex = -1;
    updatePageSearchCount();
    return;
  }

  docBody.innerHTML = cleanDocBodyHtml;

  const walker = document.createTreeWalker(docBody, NodeFilter.SHOW_TEXT, null);
  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) {
    if (node.nodeValue.trim().length > 0) textNodes.push(node);
  }

  const lowerQuery = query.toLowerCase();
  let matchCount = 0;

  textNodes.forEach((textNode) => {
    const text = textNode.nodeValue;
    const lowerText = text.toLowerCase();
    if (!lowerText.includes(lowerQuery)) return;

    const frag = document.createDocumentFragment();
    let cursor = 0;
    let idx;
    while ((idx = lowerText.indexOf(lowerQuery, cursor)) !== -1) {
      frag.appendChild(document.createTextNode(text.slice(cursor, idx)));
      const mark = document.createElement('mark');
      mark.className = 'page-search-hit';
      mark.dataset.hitIndex = matchCount;
      mark.textContent = text.slice(idx, idx + query.length);
      frag.appendChild(mark);
      matchCount++;
      cursor = idx + query.length;
    }
    frag.appendChild(document.createTextNode(text.slice(cursor)));
    textNode.parentNode.replaceChild(frag, textNode);
  });

  pageSearchState.matches = Array.from(docBody.querySelectorAll('.page-search-hit'));
  pageSearchState.activeIndex = pageSearchState.matches.length > 0 ? 0 : -1;
  highlightActiveMatch();
  updatePageSearchCount();
}

function highlightActiveMatch() {
  pageSearchState.matches.forEach((el, i) => {
    el.classList.toggle('active', i === pageSearchState.activeIndex);
  });
  const active = pageSearchState.matches[pageSearchState.activeIndex];
  if (active) active.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

function goToNextMatch(direction) {
  if (pageSearchState.matches.length === 0) return;
  pageSearchState.activeIndex =
    (pageSearchState.activeIndex + direction + pageSearchState.matches.length) %
    pageSearchState.matches.length;
  highlightActiveMatch();
  updatePageSearchCount();
}

function updatePageSearchCount() {
  const countEl = document.getElementById('page-search-count');
  const prevBtn = document.getElementById('page-search-prev');
  const nextBtn = document.getElementById('page-search-next');
  if (!countEl) return;

  const total = pageSearchState.matches.length;
  countEl.textContent = total > 0 ? `${pageSearchState.activeIndex + 1}/${total}` : '';
  prevBtn.disabled = total === 0;
  nextBtn.disabled = total === 0;
}

function initPageSearch() {
  const input = document.getElementById('page-search');
  const clearBtn = document.getElementById('page-search-clear');

  input.addEventListener('input', (e) => {
    runPageSearch(e.target.value.trim());
    clearBtn.classList.toggle('visible', e.target.value.length > 0);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') goToNextMatch(e.shiftKey ? -1 : 1);
  });
  clearBtn.addEventListener('click', () => {
    input.value = '';
    input.focus();
    runPageSearch('');
    clearBtn.classList.remove('visible');
  });
  document.getElementById('page-search-prev').addEventListener('click', () => goToNextMatch(-1));
  document.getElementById('page-search-next').addEventListener('click', () => goToNextMatch(1));
}

function togglePageSearch() {
  const wrap = document.getElementById('page-search-wrap');
  const btn = document.getElementById('toggle-page-search');
  const willOpen = !wrap.classList.contains('open');
  wrap.classList.toggle('open', willOpen);
  btn.classList.toggle('active', willOpen);
  if (willOpen) {
    document.getElementById('page-search').focus();
  } else {
    runPageSearch(''); // clear highlights when the search row is dismissed
  }
}
