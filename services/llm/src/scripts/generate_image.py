#!/usr/bin/env python3
"""Slidesmith LLM — Gemini image generation (Cycle 3 production-ready).

Cycle 3 hardening:
  - Module-level lazy import cached per worker (warm uv cache); first call may
    pay import cost, subsequent calls in same process reuse imports.
  - Per-ratio aspect-string validation (no silent fallthrough on typos).
  - Always leaves a PNG file at --out so the Node side can complete its read,
    even on hard failure (placeholder PNG is a 1x1 stub).
  - Exit codes:
      0 = success
      2 = recoverable failure (placeholder written, Node retries with backoff)
      3 = configuration error (GEMINI_API_KEY missing or aspect invalid)

Usage:
  uv run src/scripts/generate_image.py --prompt "..." --out /tmp/out.png \\
      --aspect-ratio 1:1 --count 1
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import sys
from typing import Any

from dotenv import load_dotenv

PLACEHOLDER_PNG_B64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgAAIA"
    "AAUAAY27m/MAAAAASUVORK5CYII="
)

ALLOWED_RATIOS = {"1:1", "4:5", "16:9", "9:16"}


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Slidesmith Gemini image gen")
    p.add_argument("--prompt", required=True)
    p.add_argument("--out", required=True)
    p.add_argument("--aspect-ratio", default="1:1")
    p.add_argument("--count", type=int, default=1)
    return p.parse_args()


def emit(payload: dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(payload, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def write_placeholder(path: str) -> None:
    with open(path, "wb") as f:
        f.write(base64.b64decode(PLACEHOLDER_PNG_B64))


def validate_ratio(ratio: str) -> bool:
    if ratio in ALLOWED_RATIOS:
        return True
    emit({"ok": False, "error": f"invalid_aspect_ratio: {ratio}"})
    return False


def call_gemini(prompt: str, out_path: str, aspect_ratio: str) -> bool:
    try:
        from google import genai  # type: ignore[import-not-found]
        from google.genai import types as genai_types  # type: ignore[import-not-found]
    except ImportError:
        emit({"ok": False, "error": "google-genai not installed"})
        return False
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        emit({"ok": False, "error": "GEMINI_API_KEY missing"})
        return False
    try:
        client = genai.Client(api_key=api_key)
        result = client.models.generate_images(
            model="imagen-3.0-generate-001",
            prompt=prompt,
            config=genai_types.GenerateImagesConfig(
                number_of_images=1,
                aspect_ratio=aspect_ratio,
            ),
        )
        images = getattr(result, "generated_images", None) or []
        if not images:
            emit({"ok": False, "error": "no_image_returned"})
            return False
        img = images[0].image
        # google-genai returns bytes-like or PIL.Image depending on version.
        if hasattr(img, "save"):
            img.save(out_path, format="PNG")
        else:
            data = getattr(img, "image_bytes", None) or bytes(img)
            with open(out_path, "wb") as f:
                f.write(data)
        emit({"ok": True, "out": out_path, "aspect_ratio": aspect_ratio})
        return True
    except Exception as exc:  # noqa: BLE001
        # Sanitize: never echo the full exception (may include API key in URL).
        msg = str(exc)
        if "GEMINI_API_KEY" in msg or "AIza" in msg:
            msg = "gemini_call_failed: redacted"
        emit({"ok": False, "error": f"gemini_call_failed: {msg[:200]}"})
        return False


def main() -> int:
    load_dotenv()
    args = parse_args()
    if not validate_ratio(args.aspect_ratio):
        write_placeholder(args.out)
        return 3
    if not call_gemini(args.prompt, args.out, args.aspect_ratio):
        # Always leave a file at --out so the Node side can complete its read.
        write_placeholder(args.out)
        # 3 = config (no key), 2 = recoverable.
        if not os.getenv("GEMINI_API_KEY"):
            return 3
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
