# Booky — local dev

One server, one port. Everything lives under `/booky/`.

```bash
./scripts/serve-local.sh
# or: python3 -m http.server 8080   (from repo root)
```

| What | URL |
|------|-----|
| **Game** | http://localhost:8080/booky/ |
| **Win screen (mock)** | http://localhost:8080/booky/win-preview.html?s=newbie |

In Cursor: **Ports → 8080 → globe icon**.

No public URL, no tunnel. Same `localhost` for the game and the win screen — just different paths in the `booky/` folder.

**Note:** `win-preview.html` is on the feature branch (`cursor/booky-promo-frame-brand-3b79`). If you get a 404, run `git checkout cursor/booky-promo-frame-brand-3b79` before serving.
