# Artwork used by the Visual Explainer

| What | Where | Source | Licence |
|---|---|---|---|
| 379 extra things (`thing("shopping_cart")`) | `data/icons.json` | Microsoft Fluent Emoji, Flat style, via the npm package `@iconify-json/fluent-emoji-flat` 1.2.6 | MIT, see `ICONS-LICENSE.txt` (free for commercial use; keep the licence file with the app) |
| Characters (`person(...)`) | `vis_people.py` | Drawn in code for YT Guru | Part of this app |
| Channel mascot "Professor Coin" (`mascot()`) | `vis_mascot.py` | Original design drawn in code for YT Guru | Part of this app |
| Backgrounds (`setting(...)`) | `vis_sets.py` | Drawn in code for YT Guru | Part of this app |
| Drawn objects (`coin`, `bank`, ...) | `vis_kit.py` | Drawn in code for YT Guru | Part of this app |
| Nouns not in the lists above | downloaded when first used | OpenMoji (openmoji.org) | CC BY-SA 4.0: credit "OpenMoji" in the video description when one appears |
| World map and places (`world_map()`) | `data/world_countries.json`, `data/world_places.json` | Natural Earth | Public domain. Some borders it shows are disputed. |
| Chart data (`data_chart()`) | downloaded into `data_cache/` | FRED (St. Louis Fed); World Bank | World Bank: CC BY 4.0 (the on-screen "Source:" line credits it). Some FRED series belong to other owners who restrict re-use; the scene test warns for the ones it detects. |
| Headlines and web pages (`headlines()`, `source()`) | photographed into `source_cache/` | the linked sites | Belong to their publishers; shown as short quotations with the site named. |
| Talking Presenter: face points | `face_landmarker.task`, downloaded | MediaPipe (Google) | Apache-2.0 |
| Talking Presenter: face finder | `yunet.onnx`, downloaded | OpenCV Zoo | MIT |
| Talking Presenter: cut-out | `rvm.onnx`, downloaded | Robust Video Matting | GPL-3.0: used on this computer, not shipped with the app; it does not restrict the videos |

Rebuild the icon file with `python scripts/make_icon_pack.py <icons.json from the package>`.
