"""YT Guru — 3D Explainer tool package (user, 2026-11-28).

Exposes ``router`` (mounted by backend/main.py as /api/3d). The
router import is guarded so the pure-logic submodules (shots,
prompts, style, assets, render helpers, assemble.build_srt) stay
importable in tests on machines without fastapi installed.
"""
try:
    from .router import router
except Exception:  # noqa: BLE001 — fastapi not installed (tests/CI)
    router = None

__all__ = ["router"]
