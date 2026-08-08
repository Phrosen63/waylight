function extractNestedTags(text) {
  const tagPattern = /\{\.([a-zA-ZåäöÅÄÖ0-9_-]+)\}|\{\/\}/g;
  const tags = [];

  const stack = [];

  let result = '';
  let cursor = 0; // hur långt i `text` vi kopierat till result hittills

  let match;
  while ((match = tagPattern.exec(text)) !== null) {
    const isOpenTag = match[0] !== '{/}';

    if (isOpenTag) {
      const className = match[1];
      stack.push({
        className,
        contentStart: tagPattern.lastIndex, // texten EFTER {.klass}
        segments: [],
      });

      const textBeforeThisTag = text.slice(cursor, match.index);
      if (stack.length > 1) {
        stack[stack.length - 2].segments.push(textBeforeThisTag);
      } else {
        result += textBeforeThisTag;
      }
      cursor = tagPattern.lastIndex;
    } else {
      if (stack.length === 0) {
        continue;
      }

      const closed = stack.pop();
      const textInsideThisTag = text.slice(cursor, match.index);
      closed.segments.push(textInsideThisTag);
      const innerText = closed.segments.join('');

      const token = `\u0000TAG${tags.length}\u0000`;
      tags.push({ className: closed.className, inner: innerText.trim() });

      cursor = tagPattern.lastIndex;

      if (stack.length > 0) {
        stack[stack.length - 1].segments.push(token);
      } else {
        result += token;
      }
    }
  }

  const remainingText = text.slice(cursor);
  if (stack.length > 0) {
    stack[stack.length - 1].segments.push(remainingText);
    while (stack.length > 1) {
      const inner = stack.pop();
      stack[stack.length - 1].segments.push(inner.segments.join(''));
    }
    result += stack[0].segments.join('');
  } else {
    result += remainingText;
  }

  return { text: result, tags };
}

const INLINE_SUFFIX = '-inline';
const ALWAYS_INLINE_CLASSES = new Set(['nyckelord']);
const RAW_BASE_CLASS = 'rå';

function parseTagClassName(rawClassName) {
  if (rawClassName.endsWith(INLINE_SUFFIX)) {
    return {
      baseClass: rawClassName.slice(0, -INLINE_SUFFIX.length),
      forceInline: true,
    };
  }
  return { baseClass: rawClassName, forceInline: false };
}

function isTagInline(rawClassName) {
  const { baseClass, forceInline } = parseTagClassName(rawClassName);
  if (ALWAYS_INLINE_CLASSES.has(baseClass)) return true;
  return forceInline;
}

function reconstructRawSource(inner, tagBlocks) {
  return inner.replace(/\u0000TAG(\d+)\u0000/g, (m, idxStr) => {
    const nested = tagBlocks[Number(idxStr)];
    if (!nested) return m;
    return `{.${nested.className}}${reconstructRawSource(nested.inner, tagBlocks)}{/}`;
  });
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderMarkdown(file) {
  const currentPath = file.path;

  // ----- Steg 1: extrahera {.klass}...{/} (med stöd för nästling) till platshållare -----
  const { text: bodyWithTokens, tags: tagBlocks } = extractNestedTags(file.body);
  let body = bodyWithTokens;

  // ----- Steg 2: wikilänkar -----
  body = body.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (match, rawKey, rawDisplayText) => {
    const trimmedKey = rawKey.trim();
    const customDisplayText = rawDisplayText ? rawDisplayText.trim() : null;
    const resolved = resolveLink(trimmedKey, currentPath);

    if (typeof resolved === 'string') {
      const displayText = customDisplayText || getDisplayName(resolved);
      return `[${displayText}](#${encodeURIComponent(resolved)})`;
    }
    if (resolved && resolved.locked) {
      const displayText = customDisplayText || trimmedKey;
      return `<span class="wikilink-locked" data-locked-key="${resolved.key}" data-locked-adventure="${resolved.adventureKey}" title="I det låsta äventyret &quot;${resolved.adventureName}&quot;">🔒 ${displayText}</span>`;
    }
    const displayText = customDisplayText || rawKey;
    return `<span class="link-missing-text" title="Länk saknas: ${trimmedKey}">${displayText}</span>`;
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

  function renderTagInner(inner) {
    let innerHtml = marked.parse(inner, { renderer });
    return resolveTagTokens(innerHtml);
  }

  function resolveTagTokens(htmlFragment) {
    let out = htmlFragment;
    tagBlocks.forEach((tag, i) => {
      const token = `\u0000TAG${i}\u0000`;
      if (!out.includes(token)) return; // denna tagg hör inte hemma på denna nivå

      const { baseClass } = parseTagClassName(tag.className);
      const inline = isTagInline(tag.className);
      const cssClass = `md-tag-${tag.className}`;

      if (baseClass === RAW_BASE_CLASS) {
        const rawSource = reconstructRawSource(tag.inner, tagBlocks);
        const escaped = escapeHtml(rawSource);
        const replacement = inline
          ? `<span class="md-tag ${cssClass}">${escaped}</span>`
          : `<div class="md-tag ${cssClass}">${escaped}</div>`;
        out = replaceTagToken(out, token, replacement);
        return;
      }

      if (baseClass === 'nyckelord') {
        const replacement = `<span class="md-tag ${cssClass}">${tag.inner}</span>`;
        out = out.replace(token, replacement);
        return;
      }

      const isSpelledare = baseClass === 'spelledare';
      const isKonfidentiellt = baseClass === 'konfidentiellt';
      const isLockableTag = isSpelledare || isKonfidentiellt;

      const isUnlockedForThisTag = isSpelledare
        ? isUnlocked()
        : isUnlocked() || isRevealedViaUrl(currentPath);

      let replacement;

      if (isLockableTag && !isUnlockedForThisTag) {
        replacement = inline
          ? `<span class="md-tag md-tag-locked-notice">🔒 SL</span>`
          : `<div class="md-tag md-tag-locked-notice">🔒 SL: Låst innehåll, lås upp för att visa.</div>`;
      } else if (isKonfidentiellt) {
        replacement = inline
          ? resolveTagTokens(stripWrappingP(marked.parseInline(tag.inner, { renderer })))
          : renderTagInner(tag.inner);
      } else if (inline) {
        const innerHtml = stripWrappingP(marked.parseInline(tag.inner, { renderer }));
        replacement = `<span class="md-tag ${cssClass}">${resolveTagTokens(innerHtml)}</span>`;
      } else {
        replacement = `<div class="md-tag ${cssClass}">${renderTagInner(tag.inner)}</div>`;
      }

      out = replaceTagToken(out, token, replacement);
    });
    return out;
  }

  html = resolveTagTokens(html);

  return html;
}

function replaceTagToken(html, token, replacement) {
  const wrappedInP = new RegExp(`<p>\\s*${token}\\s*</p>`);
  if (wrappedInP.test(html)) {
    return html.replace(wrappedInP, replacement);
  }
  return html.replace(token, replacement);
}

function stripWrappingP(html) {
  const match = /^<p>([\s\S]*)<\/p>\s*$/.exec(html.trim());
  return match ? match[1] : html;
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
