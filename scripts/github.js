const GITHUB_OWNER = 'Phrosen63';
const GITHUB_REPO = 'waypoints';
const GITHUB_BRANCH = 'main';

const GITHUB_API_TREE_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/trees/${GITHUB_BRANCH}?recursive=1`;
const GITHUB_API_REF_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/refs/heads/${GITHUB_BRANCH}`;

const CACHE_KEY = `waylight-cache:${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}`;

const CONTENT_ROOT_FOLDERS = ['regler', 'monster', 'karaktarer', 'foremal', 'aventyr'];

function isUnderContentRoot(path) {
  const topLevel = path.split('/')[0];
  return CONTENT_ROOT_FOLDERS.includes(topLevel);
}

function rawFileUrl(path) {
  return `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${path}`;
}

function isAdventureContentPath(path) {
  return path.startsWith('aventyr/') && !path.endsWith('aventyr.yaml');
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null; // corrupt cache, treat as absent
  }
}

function writeCache(sha, filesObject, adventureFilePathsObject) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        sha,
        cachedAt: Date.now(),
        files: filesObject,
        adventureFilePaths: adventureFilePathsObject,
      }),
    );
  } catch (e) {
    console.warn('Waylight: kunde inte spara cache:', e);
  }
}

function clearCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (e) {
    /* ignore */
  }
}

function adventureCacheKey(advKey, sha) {
  return `${CACHE_KEY}:aventyr:${advKey}:${sha}`;
}

function readAdventureCache(advKey, sha) {
  try {
    const raw = localStorage.getItem(adventureCacheKey(advKey, sha));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function writeAdventureCache(advKey, sha, filesObject) {
  try {
    localStorage.setItem(adventureCacheKey(advKey, sha), JSON.stringify(filesObject));
  } catch (e) {
    console.warn(`Waylight: kunde inte cacha äventyret ${advKey}:`, e);
  }
}

function filesMapToObject(map) {
  const obj = {};
  for (const [path, value] of map) obj[path] = value;
  return obj;
}

function objectToFilesMap(obj) {
  const map = new Map();
  for (const [path, value] of Object.entries(obj)) map.set(path, value);
  return map;
}

async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i], i);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return results;
}

async function fetchAndStoreFile(path) {
  try {
    const res = await fetch(rawFileUrl(path));
    if (!res.ok) {
      state.loadErrors.push(`Kunde inte hämta ${path} (status ${res.status}).`);
      return false;
    }
    const raw = await res.text();

    if (path.endsWith('aventyr.yaml')) {
      let data = {};
      try {
        data = jsyaml.load(raw) || {};
      } catch (e) {
        state.loadErrors.push(`YAML-fel i ${path}: ${e.message}`);
      }
      state.files.set(path, { isProject: true, data, raw });
    } else {
      const parsed = parseFile(path, raw);
      state.files.set(path, {
        ...parsed,
        raw,
        path,
        folder: path.split('/')[0],
      });
    }
    return true;
  } catch (e) {
    state.loadErrors.push(`Nätverksfel vid hämtning av ${path}.`);
    return false;
  }
}

async function loadFromGitHub(onProgress, forceRefresh = false) {
  state.loadErrors = [];

  // ----- 0. Check current commit SHA against cache -----
  let currentSha = null;
  try {
    const refRes = await fetch(GITHUB_API_REF_URL);
    if (refRes.ok) {
      const refData = await refRes.json();
      currentSha = refData?.object?.sha || null;
    }
  } catch (e) {
    // network hiccup on the lightweight check; full fetch below will surface
    // any real connectivity problem with a proper error message.
  }
  state.currentSha = currentSha;

  if (!forceRefresh && currentSha) {
    const cached = readCache();
    if (cached && cached.sha === currentSha) {
      state.files = objectToFilesMap(cached.files);
      state.adventureFilePaths = cached.adventureFilePaths || {};
      return { ok: true, fromCache: true, cachedAt: cached.cachedAt };
    }
  }

  // ----- 1. Fetch the repo's file tree -----
  state.files.clear();
  state.adventureFilePaths = {}; // advKey -> array of paths not yet fetched
  let treeData;
  try {
    const treeRes = await fetch(GITHUB_API_TREE_URL);
    if (!treeRes.ok) {
      if (treeRes.status === 404) {
        return {
          ok: false,
          error: 'repo-not-found',
          detail: `Hittade inget repo på ${GITHUB_OWNER}/${GITHUB_REPO} (gren: ${GITHUB_BRANCH}).`,
        };
      }
      if (treeRes.status === 403) {
        return {
          ok: false,
          error: 'rate-limited',
          detail: 'GitHub API:ets gräns för oautentiserade anrop är nådd. Försök igen om en stund.',
        };
      }
      return {
        ok: false,
        error: 'unknown',
        detail: `GitHub svarade med status ${treeRes.status}.`,
      };
    }
    treeData = await treeRes.json();
  } catch (e) {
    return {
      ok: false,
      error: 'network',
      detail:
        'Kunde inte nå GitHub. Kontrollera din internetanslutning eller nätverksinställningar.',
    };
  }

  if (treeData.truncated) {
    state.loadErrors.push(
      'Repot är så stort att GitHub API:et trunkerade filträdet — vissa filer kan saknas.',
    );
  }

  const allRelevant = (treeData.tree || []).filter(
    (entry) =>
      entry.type === 'blob' &&
      (entry.path.endsWith('.md') || entry.path.endsWith('aventyr.yaml')) &&
      isUnderContentRoot(entry.path),
  );

  const eagerEntries = allRelevant.filter((entry) => !isAdventureContentPath(entry.path));
  const lazyEntries = allRelevant.filter((entry) => isAdventureContentPath(entry.path));

  if (allRelevant.length === 0) {
    return {
      ok: false,
      error: 'empty-repo',
      detail:
        'Repot innehåller inga .md- eller aventyr.yaml-filer under regler/, monster/, karaktarer/, foremal/ eller aventyr/.',
    };
  }

  // Record lazy paths grouped by adventure key, without fetching their content yet.
  lazyEntries.forEach((entry) => {
    const advKey = entry.path.split('/')[1];
    if (!state.adventureFilePaths[advKey]) state.adventureFilePaths[advKey] = [];
    state.adventureFilePaths[advKey].push(entry.path);
  });

  // ----- 3. Fetch eager content only (bounded concurrency) -----
  let completed = 0;
  await mapWithConcurrency(eagerEntries, 8, async (entry) => {
    await fetchAndStoreFile(entry.path);
    completed++;
    if (onProgress) onProgress(completed, eagerEntries.length);
  });

  if (state.files.size === 0) {
    return {
      ok: false,
      error: 'all-failed',
      detail: 'Alla filhämtningar misslyckades. Se detaljer nedan.',
    };
  }

  // ----- 4. Update cache for next time -----
  if (currentSha) {
    writeCache(currentSha, filesMapToObject(state.files), state.adventureFilePaths);
  }

  return { ok: true, fromCache: false };
}

async function loadAdventureContent(advKey) {
  const paths = state.adventureFilePaths?.[advKey];
  if (!paths || paths.length === 0) {
    return { ok: true, alreadyLoaded: true }; // nothing pending — either already loaded or adventure has no content files
  }

  // Try the per-adventure cache first (only valid if repo hasn't changed since).
  if (state.currentSha) {
    const cached = readAdventureCache(advKey, state.currentSha);
    if (cached) {
      for (const [path, value] of Object.entries(cached)) {
        state.files.set(path, value);
      }
      delete state.adventureFilePaths[advKey];
      return { ok: true, alreadyLoaded: false, fromCache: true };
    }
  }

  const fetchedPaths = [];
  await mapWithConcurrency(paths, 8, async (path) => {
    const success = await fetchAndStoreFile(path);
    if (success) fetchedPaths.push(path);
  });

  if (fetchedPaths.length === 0 && paths.length > 0) {
    return { ok: false, detail: `Kunde inte hämta filer för äventyret "${advKey}".` };
  }

  if (state.currentSha) {
    const advFilesObj = {};
    fetchedPaths.forEach((path) => {
      advFilesObj[path] = state.files.get(path);
    });
    writeAdventureCache(advKey, state.currentSha, advFilesObj);
  }

  delete state.adventureFilePaths[advKey];
  return { ok: true, alreadyLoaded: false, fromCache: false };
}
