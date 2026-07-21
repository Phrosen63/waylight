const MASTER_PASSWORD_HASH = 'c8a3fffa50460cd2169fe1c9aba386a24807e71a0f53b243fe8780ed2aea13cd';
const UNLOCK_SESSION_KEY = "waylight-unlocked";

function isUnlocked() {
  return sessionStorage.getItem(UNLOCK_SESSION_KEY) === "true";
}

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

async function tryUnlock(password) {
  const hash = await sha256Hex(password);
  if (hash === MASTER_PASSWORD_HASH) {
    sessionStorage.setItem(UNLOCK_SESSION_KEY, "true");
    return true;
  }
  return false;
}

function lock() {
  sessionStorage.removeItem(UNLOCK_SESSION_KEY);
}

function refreshForLockStateChange() {
  updateLockButton();
  buildTree();
  if (state.activePath) renderContent();
}

function updateLockButton() {
  const btn = document.getElementById("lock-btn");
  if (!btn) return;
  const unlocked = isUnlocked();
  btn.textContent = unlocked ? "🔓" : "🔒";
  btn.title = unlocked ? "Lås äventyr (klicka för att låsa)" : "Lås upp äventyr";
  btn.classList.toggle("unlocked", unlocked);
}

let activeAuthPrompt = null; // { overlay, promise } while a modal is open, else null

function promptForPassword() {
  if (activeAuthPrompt) {
    return activeAuthPrompt.promise; // reuse the already-open modal
  }

  const promise = new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "auth-overlay";
    overlay.innerHTML = `
      <div class="auth-modal">
        <div class="auth-modal-title">🔒 Lås upp äventyr</div>
        <p class="auth-modal-text">Ange lösenordet för att komma åt äventyr och spelledarinnehåll.</p>
        <input type="password" id="auth-password-input" class="auth-password-input" placeholder="Lösenord" autocomplete="off">
        <div class="auth-modal-error" id="auth-modal-error"></div>
        <div class="auth-modal-actions">
          <button class="auth-cancel-btn" id="auth-cancel-btn">Avbryt</button>
          <button class="auth-submit-btn" id="auth-submit-btn">Lås upp</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const input = overlay.querySelector("#auth-password-input");
    const errorEl = overlay.querySelector("#auth-modal-error");
    input.focus();

    function close(result) {
      overlay.remove();
      activeAuthPrompt = null;
      resolve(result);
    }

    async function attemptSubmit() {
      const password = input.value;
      if (!password) return;
      const success = await tryUnlock(password);
      if (success) {
        close(true);
      } else {
        errorEl.textContent = "Fel lösenord.";
        input.value = "";
        input.focus();
      }
    }

    overlay.querySelector("#auth-submit-btn").addEventListener("click", attemptSubmit);
    overlay.querySelector("#auth-cancel-btn").addEventListener("click", () => close(false));
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(false); });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") attemptSubmit();
      if (e.key === "Escape") close(false);
    });

    activeAuthPrompt = { overlay, close };
  });

  activeAuthPrompt = { ...activeAuthPrompt, promise };
  return promise;
}

function closeActivePrompt() {
  if (activeAuthPrompt) activeAuthPrompt.close(false);
}

function initMasterLock() {
  const btn = document.getElementById("lock-btn");
  btn.addEventListener("click", async () => {
    if (isUnlocked()) {
      lock();
      refreshForLockStateChange();
      return;
    }

    if (activeAuthPrompt) {
      closeActivePrompt();
      return;
    }

    const success = await promptForPassword();
    if (success) refreshForLockStateChange();
  });
  updateLockButton();
}
