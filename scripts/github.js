const GITHUB_OWNER = 'Phrosen63';
const GITHUB_REPO = 'waypoints';
const GITHUB_BRANCH = 'main';

const GITHUB_API_TREE_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/trees/${GITHUB_BRANCH}?recursive=1`;

const GITHUB_API_REF_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/refs/heads/${GITHUB_BRANCH}`;

const CACHE_KEY = `waylight-cache:${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}`;

function rawFileUrl(path) {
  return `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${path}`;
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

function writeCache(sha, filesObject) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        sha,
        cachedAt: Date.now(),
        files: filesObject,
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

async function loadFromGitHub(onProgress, forceRefresh = false) {
  state.loadErrors = [];

  let currentSha = null;
  try {
    const refRes = await fetch(GITHUB_API_REF_URL);
    if (refRes.ok) {
      const refData = await refRes.json();
      currentSha = refData?.object?.sha || null;
    }
    // If this fails, we fall through and just do a full fetch below —
    // worst case we skip the cache optimization, we don't hard-fail here.
  } catch (e) {
    // network hiccup on the lightweight check; full fetch below will surface
    // any real connectivity problem with a proper error message.
  }

  if (!forceRefresh && currentSha) {
    const cached = readCache();
    if (cached && cached.sha === currentSha) {
      state.files = objectToFilesMap(cached.files);
      return { ok: true, fromCache: true, cachedAt: cached.cachedAt };
    }
  }

  state.files.clear();
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

  const relevantEntries = (treeData.tree || []).filter(
    (entry) =>
      entry.type === 'blob' && (entry.path.endsWith('.md') || entry.path.endsWith('project.yaml')),
  );

  if (relevantEntries.length === 0) {
    return {
      ok: false,
      error: 'empty-repo',
      detail: 'Repot innehåller inga .md- eller project.yaml-filer.',
    };
  }

  let completed = 0;
  await mapWithConcurrency(relevantEntries, 8, async (entry) => {
    try {
      const res = await fetch(rawFileUrl(entry.path));
      if (!res.ok) {
        state.loadErrors.push(`Kunde inte hämta ${entry.path} (status ${res.status}).`);
        return;
      }
      const raw = await res.text();

      if (entry.path.endsWith('project.yaml')) {
        let data = {};
        try {
          data = jsyaml.load(raw) || {};
        } catch (e) {
          state.loadErrors.push(`YAML-fel i ${entry.path}: ${e.message}`);
        }
        state.files.set(entry.path, { isProject: true, data, raw });
      } else {
        const parsed = parseFile(entry.path, raw);
        state.files.set(entry.path, {
          ...parsed,
          raw,
          path: entry.path,
          folder: entry.path.split('/')[0],
        });
      }
    } catch (e) {
      state.loadErrors.push(`Nätverksfel vid hämtning av ${entry.path}.`);
    } finally {
      completed++;
      if (onProgress) onProgress(completed, relevantEntries.length);
    }
  });

  if (state.files.size === 0) {
    return {
      ok: false,
      error: 'all-failed',
      detail: 'Alla filhämtningar misslyckades. Se detaljer nedan.',
    };
  }

  if (currentSha) {
    writeCache(currentSha, filesMapToObject(state.files));
  }

  return { ok: true, fromCache: false };
}
