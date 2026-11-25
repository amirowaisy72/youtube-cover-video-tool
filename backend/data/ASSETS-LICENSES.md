# Artwork used by the Visual Explainer

| What | Where | Source | Licence |
|---|---|---|---|
| 379 extra things (`thing("shopping_cart")`) | `data/icons.json` | Microsoft Fluent Emoji, Flat style, via the npm package `@iconify-json/fluent-emoji-flat` 1.2.6 | MIT, see `ICONS-LICENSE.txt` (free for commercial use; keep the licence file with the app) |
| Characters (`person(...)`) | `vis_people.py` | Drawn in code for YT Guru | Part of this app |
| Backgrounds (`setting(...)`) | `vis_sets.py` | Drawn in code for YT Guru | Part of this app |
| Drawn objects (`coin`, `bank`, ...) | `vis_kit.py` | Drawn in code for YT Guru | Part of this app |
| Nouns not in the lists above | downloaded when first used | OpenMoji (openmoji.org) | CC BY-SA 4.0: credit "OpenMoji" in the video description when one appears |

Rebuild the icon file with `python scripts/make_icon_pack.py <icons.json from the package>`.
