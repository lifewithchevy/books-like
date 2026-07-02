# Booky — local dev

One server, one page: `/booky/`

```bash
./scripts/serve-local.sh
# or: python3 -m http.server 8080   (from repo root)
```

| What | URL |
|------|-----|
| **Game** | http://localhost:8080/booky/ |
| **Win screen (mock, same page)** | http://localhost:8080/booky/?preview=newbie |

Other preview scenarios (all on `/booky/`): `?preview=win`, `?preview=loss`, `?preview=featured`, `?preview=streak`

In Cursor: **Ports → 8080 → globe icon**.

No separate preview page — the end screen changes live in `index.html`, `styles.css`, and `app.js`. Preview mode only fakes stats so you can see the win screen without playing.

**Branch:** these changes are on `cursor/booky-promo-frame-brand-3b79` until merged to `main`.
