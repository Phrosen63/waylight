const state = {
  files: new Map(), // path -> { frontmatter, body, raw, folder }
  openTabs: [], // array of paths, in order
  activePath: null,
  currentProject: null, // path prefix, t.ex. "aventyr/den-sjunkna-staden"
  loadErrors: [],
  closedTabsHistory: [], // stack of { path, index } — most recently closed last, for undo (Ctrl+Z)
  adventureFilePaths: {}, // advKey -> [paths] not yet fetched (lazy adventure loading, see github.js)
  currentSha: null, // repo's current commit SHA, used for per-adventure cache keys
};

const TYPE_ICONS = {
  regel: '§',
  monster: '☠',
  karaktär: '☺',
  plats: '⌂',
  föremål: '◆',
  default: '•',
};

function iconFor(type) {
  return TYPE_ICONS[type] || TYPE_ICONS.default;
}

function parseFile(path, raw) {
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!fmMatch) {
    return { frontmatter: {}, body: raw.trim() };
  }
  const [, fmRaw, body] = fmMatch;
  let frontmatter = {};
  try {
    frontmatter = jsyaml.load(fmRaw) || {};
  } catch (e) {
    console.error(`YAML-fel i ${path}:`, e);
  }
  return { frontmatter, body: body.trim() };
}

function resolveLink(key, fromPath) {
  if (state.files.has(key)) return key; // already a full path

  const fromParts = fromPath.split('/');
  const isInAdventure = fromParts[0] === 'aventyr';
  const adventurePrefix = isInAdventure ? fromParts.slice(0, 2).join('/') : null;

  if (adventurePrefix) {
    for (const [path] of state.files) {
      if (path.startsWith(adventurePrefix + '/') && path.endsWith('/' + key + '.md')) {
        return path;
      }
    }
  }

  const globalFolders = ['regler', 'monster', 'karaktarer', 'foremal'];
  for (const folder of globalFolders) {
    for (const [path, file] of state.files) {
      if (file.isProject) continue;
      if (path.startsWith(folder + '/') && path.endsWith('/' + key + '.md')) return path;
      if (path === `${folder}/${key}.md`) return path; // direct child of the folder, no subfolder
    }
  }

  for (const [path, file] of state.files) {
    if (!file.isProject) continue; // only aventyr.yaml entries carry a "filer" index
    const advKey = path.split('/')[1];
    const fileIndex = file.data?.filer || [];
    const matchingEntry = fileIndex.find((entry) => entry.split('/').pop() === key);
    if (matchingEntry) {
      const alreadyLoadedPath = [...state.files.keys()].find(
        (p) => p.startsWith(`aventyr/${advKey}/`) && p.endsWith('/' + key + '.md'),
      );
      if (alreadyLoadedPath) return alreadyLoadedPath;

      return {
        locked: true,
        adventureKey: advKey,
        adventureName: file.data?.namn || advKey,
        key,
      };
    }
  }

  return null; // unresolved anywhere
}

function getDisplayName(path) {
  const f = state.files.get(path);
  if (!f) return path.split('/').pop().replace('.md', '');
  return f.frontmatter?.namn || path.split('/').pop().replace('.md', '');
}

function getType(path) {
  const f = state.files.get(path);
  return f?.frontmatter?.type || null;
}

function isConfidentialFile(path, file) {
  if (path.startsWith('aventyr/')) return true;
  return file?.frontmatter?.confidential === true;
}

function detectNameCollisions() {
  const scopedNames = new Map(); // scopeKey -> Map(filename -> [paths])

  for (const [path, file] of state.files) {
    if (file.isProject) continue; // project.yaml isn't link-targetable

    const filename = path.split('/').pop().replace(/\.md$/, '');
    const parts = path.split('/');
    const scopeKey =
      parts[0] === 'aventyr'
        ? `aventyr:${parts[1]}` // scope = this specific adventure
        : `global:${parts[0]}`; // scope = this global top-level folder

    if (!scopedNames.has(scopeKey)) scopedNames.set(scopeKey, new Map());
    const namesInScope = scopedNames.get(scopeKey);
    if (!namesInScope.has(filename)) namesInScope.set(filename, []);
    namesInScope.get(filename).push(path);
  }

  const collisions = [];
  for (const [scopeKey, namesInScope] of scopedNames) {
    for (const [name, paths] of namesInScope) {
      if (paths.length > 1) {
        collisions.push({ name, scope: scopeKey, paths });
      }
    }
  }
  return collisions;
}
