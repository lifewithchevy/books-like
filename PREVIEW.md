# Booky preview — always working

## One link to bookmark (in this Cursor session)

Run once if preview isn't up:

```bash
./scripts/ensure-preview.sh
```

Then open **the hub** (paste in the right-side browser):

**`/booky/preview-hub.html`** on whatever host the script prints.

The hub uses **relative links** — win screen, game, and promos always work on the same host.

| Page | Path |
|------|------|
| **Hub (bookmark this)** | `/booky/preview-hub.html` |
| **Win screen** | `/booky/?preview=win` |
| **Full game** | `/booky/` |

## Stable preview (Vercel, not prod)

Every push to `cursor/**` branches deploys a **Vercel preview** (never 90books.com).

Check **PR #5** for the bot comment with the stable win-screen URL — it updates on each push.

## If the public tunnel link dies

The preview **daemon auto-restarts** the tunnel. Refresh the hub page or re-run:

```bash
./scripts/ensure-preview.sh
```

## Cursor port forwarding

If the tunnel fails, use **Ports → 8080 → globe icon** → open `/booky/preview-hub.html`.
