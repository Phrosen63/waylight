# Waylight: master password lock

This is a UX deterrent, not real security — anything served from a public
GitHub repo can be read directly by anyone determined enough (view source,
devtools, raw.githubusercontent.com). The point is to keep casual players
from stumbling onto adventure spoilers while browsing rules/monsters with
the GM, not to cryptographically protect the content.

The password itself is never stored in plaintext here — only its SHA-256
hash, computed once and pasted in below. To set/change the password:
  1. Open browser devtools console anywhere, run:
```js
crypto.subtle.digest("SHA-256", new TextEncoder().encode("dittlösenord"))
  .then(buf => console.log([...new Uint8Array(buf)].map(b => b.toString(16).padStart(2,"0")).join("")))
```
  2. Paste the resulting hex string as MASTER_PASSWORD_HASH.
