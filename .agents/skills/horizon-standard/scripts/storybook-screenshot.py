#!/usr/bin/env python3
"""Capture pixel-accurate screenshots of Storybook stories via Playwright.

The canonical visual-verification screenshot tool for the horizon-standard
visual-verifier subagent. Reads a list of story IDs (explicit or via
Storybook's /index.json), opens each story's iframe URL in headless
Chromium, waits for network-idle + an animation settle, and writes a PNG
plus a JSON manifest mapping story IDs to file paths.

Designed to be a black box for agents:
- Single command, deterministic output, exit codes that mean something.
- Errors are actionable strings on stderr, not stack traces.
- Manifest JSON enables downstream Figma diffs, regression DBs, etc.

Usage:
  storybook-screenshot.py --story <id> [--story <id> ...] [--out-dir DIR]
  storybook-screenshot.py --all [--filter PREFIX] [--out-dir DIR]
  storybook-screenshot.py --help

Exit codes:
  0 — every requested story captured.
  1 — one or more stories failed (manifest still written for the successes).
  2 — invalid arguments / bad CLI usage.
  3 — Storybook unreachable.
  4 — Playwright launch failure (browser not installed, etc.).
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path
from typing import Iterable, Optional


DEFAULT_STORYBOOK_URL = "http://localhost:6500"
DEFAULT_VIEWPORT = (1440, 900)
DEFAULT_SETTLE_MS = 800
NAVIGATION_TIMEOUT_MS = 15_000


def _eprint(msg: str) -> None:
    print(msg, file=sys.stderr, flush=True)


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="storybook-screenshot.py",
        description=(
            "Capture Storybook story screenshots via headless Playwright. "
            "Outputs PNGs and a JSON manifest mapping story IDs to file paths."
        ),
    )
    parser.add_argument(
        "--storybook-url",
        "--base-url",
        dest="storybook_url",
        default=os.environ.get("STORYBOOK_URL", DEFAULT_STORYBOOK_URL),
        help=f"Base URL of running Storybook (default: {DEFAULT_STORYBOOK_URL}).",
    )
    parser.add_argument(
        "--story",
        action="append",
        default=[],
        metavar="STORY_ID",
        help="Story ID to capture (e.g. components-overlays-dialog-dialog--with-action-footer). May be repeated.",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Discover all stories via Storybook's /index.json and capture each.",
    )
    parser.add_argument(
        "--filter",
        default=None,
        metavar="PREFIX",
        help="When --all, only capture story IDs starting with this prefix (e.g. components-overlays-).",
    )
    parser.add_argument(
        "--out-dir",
        default=None,
        metavar="DIR",
        help=(
            "Output directory for PNGs and manifest. Defaults to "
            ".pcln-ai-output/horizon-standard/screenshots/YYYY-MM-DD/ relative to cwd."
        ),
    )
    parser.add_argument(
        "--viewport",
        default=f"{DEFAULT_VIEWPORT[0]}x{DEFAULT_VIEWPORT[1]}",
        metavar="WxH",
        help=f"Viewport size as WIDTHxHEIGHT (default: {DEFAULT_VIEWPORT[0]}x{DEFAULT_VIEWPORT[1]}).",
    )
    parser.add_argument(
        "--full-page",
        action="store_true",
        help="Capture full document length, not just viewport. Off by default — overlay stories rarely need it.",
    )
    parser.add_argument(
        "--settle-ms",
        type=int,
        default=DEFAULT_SETTLE_MS,
        help=f"Extra delay after networkidle, in ms (default: {DEFAULT_SETTLE_MS}).",
    )
    parser.add_argument(
        "--list-only",
        action="store_true",
        help="Resolve the story set and print it. Do not launch Playwright. Useful for dry runs and CI.",
    )

    args = parser.parse_args(argv)

    if not args.story and not args.all:
        parser.error("must specify at least one --story <id> or --all")
    if args.filter and not args.all:
        parser.error("--filter is only valid with --all")
    try:
        w_str, h_str = args.viewport.lower().split("x", 1)
        args.viewport_w = int(w_str)
        args.viewport_h = int(h_str)
        if args.viewport_w <= 0 or args.viewport_h <= 0:
            raise ValueError
    except ValueError:
        parser.error(f"--viewport must be WIDTHxHEIGHT with positive ints, got {args.viewport!r}")

    if args.out_dir is None:
        date = datetime.now().strftime("%Y-%m-%d")
        args.out_dir = f".pcln-ai-output/horizon-standard/screenshots/{date}"

    return args


def fetch_story_index(storybook_url: str) -> dict:
    """Fetch /index.json from a running Storybook. Raises ConnectionError with an actionable message."""
    url = storybook_url.rstrip("/") + "/index.json"
    try:
        with urllib.request.urlopen(url, timeout=10) as resp:
            raw = resp.read().decode("utf-8")
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ConnectionResetError) as e:
        raise ConnectionError(
            f"could not reach Storybook at {url} ({e}). "
            f"Start Storybook locally first, or pass --storybook-url. "
            f"On the pcln-web monorepo: `cd design-system/horizon && rushx storybook`."
        ) from e
    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        raise ConnectionError(
            f"Storybook at {url} returned non-JSON (server may still be starting up or hot-rebuilding). "
            f"Wait for Storybook to finish loading and retry. ({e})"
        ) from e


def resolve_story_ids(args: argparse.Namespace) -> list[str]:
    """Resolve the final list of story IDs to capture, in stable order."""
    ids: list[str] = []
    if args.all:
        index = fetch_story_index(args.storybook_url)
        entries = index.get("entries", {})
        for sid, entry in entries.items():
            if entry.get("type") != "story":
                continue
            if args.filter and not sid.startswith(args.filter):
                continue
            ids.append(sid)
    ids.extend(args.story)
    seen: set[str] = set()
    deduped: list[str] = []
    for sid in ids:
        if sid not in seen:
            seen.add(sid)
            deduped.append(sid)
    return deduped


def capture(
    story_ids: Iterable[str],
    storybook_url: str,
    out_dir: Path,
    viewport: tuple[int, int],
    full_page: bool,
    settle_ms: int,
) -> tuple[list[dict], list[dict]]:
    """Run Playwright over story_ids. Returns (successes, failures) lists of manifest entries."""
    try:
        from playwright.sync_api import sync_playwright  # type: ignore[import-not-found]
    except ImportError as e:
        _eprint(
            f"playwright not installed in this environment ({e}). "
            f"Install with: pip install playwright && playwright install chromium"
        )
        sys.exit(4)

    out_dir.mkdir(parents=True, exist_ok=True)

    successes: list[dict] = []
    failures: list[dict] = []

    try:
        with sync_playwright() as p:
            try:
                browser = p.chromium.launch(headless=True)
            except Exception as e:  # noqa: BLE001 — surface the actionable error
                _eprint(
                    f"failed to launch headless Chromium ({e}). "
                    f"Run: playwright install chromium"
                )
                sys.exit(4)
            ctx = browser.new_context(viewport={"width": viewport[0], "height": viewport[1]})
            page = ctx.new_page()
            for sid in story_ids:
                url = f"{storybook_url.rstrip('/')}/iframe.html?id={sid}&viewMode=story"
                png_path = out_dir / f"{sid}.png"
                started = time.time()
                try:
                    page.goto(url, timeout=NAVIGATION_TIMEOUT_MS)
                    page.wait_for_load_state("networkidle", timeout=NAVIGATION_TIMEOUT_MS)
                    if settle_ms > 0:
                        page.wait_for_timeout(settle_ms)
                    page.screenshot(path=str(png_path), full_page=full_page)
                    successes.append(
                        {
                            "storyId": sid,
                            "url": url,
                            "screenshot": str(png_path),
                            "viewport": list(viewport),
                            "fullPage": full_page,
                            "elapsedMs": int((time.time() - started) * 1000),
                        }
                    )
                    print(f"OK {sid} -> {png_path}")
                except Exception as e:  # noqa: BLE001
                    failures.append(
                        {
                            "storyId": sid,
                            "url": url,
                            "error": str(e),
                            "elapsedMs": int((time.time() - started) * 1000),
                        }
                    )
                    _eprint(f"FAIL {sid}: {e}")
            browser.close()
    except Exception as e:  # noqa: BLE001 — outer playwright session error
        _eprint(f"playwright session error ({e}).")
        if not successes and not failures:
            sys.exit(4)
        # Session ended early — add a sentinel so callers always see exit-code 1.
        failures.append({"storyId": "__session_error__", "url": "", "error": str(e), "elapsedMs": 0})
        return successes, failures

    return successes, failures


def write_manifest(out_dir: Path, args: argparse.Namespace, successes: list[dict], failures: list[dict]) -> Path:
    manifest_path = out_dir / "manifest.json"
    manifest = {
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
        "storybookUrl": args.storybook_url,
        "viewport": [args.viewport_w, args.viewport_h],
        "fullPage": args.full_page,
        "settleMs": args.settle_ms,
        "successes": successes,
        "failures": failures,
        "summary": {
            "requested": len(successes) + len(failures),
            "captured": len(successes),
            "failed": len(failures),
        },
    }
    manifest_path.write_text(json.dumps(manifest, indent=2))
    return manifest_path


def main(argv: Optional[list[str]] = None) -> int:
    args = parse_args(argv if argv is not None else sys.argv[1:])

    try:
        story_ids = resolve_story_ids(args)
    except ConnectionError as e:
        _eprint(str(e))
        return 3

    if not story_ids:
        _eprint("no stories matched the filter / --story arguments — nothing to capture.")
        return 2

    if args.list_only:
        for sid in story_ids:
            print(sid)
        return 0

    out_dir = Path(args.out_dir).resolve()
    successes, failures = capture(
        story_ids=story_ids,
        storybook_url=args.storybook_url,
        out_dir=out_dir,
        viewport=(args.viewport_w, args.viewport_h),
        full_page=args.full_page,
        settle_ms=args.settle_ms,
    )

    manifest_path = write_manifest(out_dir, args, successes, failures)
    print(f"manifest: {manifest_path}")
    print(f"captured {len(successes)} / {len(successes) + len(failures)}")

    return 0 if not failures else 1


if __name__ == "__main__":
    sys.exit(main())
