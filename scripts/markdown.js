function renderMarkdown(file) {
  const currentPath = file.path;

  const tagBlocks = [];
  let body = file.body.replace(
    /\{\.([a-zA-Z0-9_-]+)\}([\s\S]*?)\{\/\}/g,
    (match, className, inner) => {
      const token = `\u0000TAG${tagBlocks.length}\u0000`;
      tagBlocks.push({ className, inner: inner.trim() });
      return token;
    },
  );

  body = body.replace(/\[\[([^\]]+)\]\]/g, (match, key) => {
    const trimmedKey = key.trim();
    const resolved = resolveLink(trimmedKey, currentPath);
    if (typeof resolved === 'string') {
      return `[${getDisplayName(resolved)}](#${encodeURIComponent(resolved)})`;
    }
    if (resolved && resolved.locked) {
      return `<span class="wikilink-locked" data-locked-key="${resolved.key}" data-locked-adventure="${resolved.adventureKey}" title="I det låsta äventyret &quot;${resolved.adventureName}&quot;">🔒 ${trimmedKey}</span>`;
    }
    return `<span class="link-missing-text" title="Länk saknas: ${key}">${key}</span>`;
  });

  const renderer = new marked.Renderer();
  renderer.link = (href, title, text) => {
    if (href && href.startsWith('#')) {
      return `<a href="${href}" class="internal-link" data-path="${decodeURIComponent(href.slice(1))}">${text}</a>`;
    }
    return `<a href="${href}" target="_blank" rel="noopener">${text}</a>`;
  };
  renderer.blockquote = (quote) => {
    const isTodo = /^\s*<p>\s*<strong>TODO:?<\/strong>/i.test(quote);
    return `<blockquote class="${isTodo ? 'todo' : ''}">${quote}</blockquote>`;
  };
  renderer.image = (href, title, text) => {
    const src = resolveImageSrc(href, currentPath);
    const titleAttr = title ? ` title="${title}"` : '';
    return `<img src="${src}" alt="${text}"${titleAttr} loading="lazy" class="doc-image">`;
  };

  let html = marked.parse(body, { renderer });

  tagBlocks.forEach((tag, i) => {
    const token = `\u0000TAG${i}\u0000`;
    let replacement;

    const isLockableTag = tag.className === 'spelledare' || tag.className === 'konfidentiellt';

    if (isLockableTag && !isUnlocked()) {
      replacement = `<div class="md-tag md-tag-locked-notice">🔒 SL: Låst innehåll, lås upp för att visa.</div>`;
    } else if (tag.className === 'konfidentiellt') {
      // Upplåst: rendera innehållet normalt, ingen ram/wrapper alls
      replacement = marked.parse(tag.inner, { renderer });
    } else {
      const innerHtml = marked.parse(tag.inner, { renderer });
      replacement = `<div class="md-tag md-tag-${tag.className}">${innerHtml}</div>`;
    }

    const wrappedInP = new RegExp(`<p>\\s*${token}\\s*</p>`);
    if (wrappedInP.test(html)) {
      html = html.replace(wrappedInP, replacement);
    } else {
      html = html.replace(token, replacement);
    }
  });

  return html;
}

function resolveImageSrc(href, fromPath) {
  if (/^https?:\/\//i.test(href)) return href;
  const resolvedPath = resolveRelativePath(fromPath, href);
  return rawFileUrl(resolvedPath);
}

function resolveRelativePath(basePath, relativeHref) {
  const baseDir = basePath.split('/').slice(0, -1); // drop the filename itself
  const relParts = relativeHref.split('/');

  const resultParts = [...baseDir];
  for (const part of relParts) {
    if (part === '' || part === '.') continue; // ignore empty segments and "./"
    if (part === '..') {
      resultParts.pop(); // go up one directory
    } else {
      resultParts.push(part);
    }
  }
  return resultParts.join('/');
}
