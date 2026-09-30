#!/usr/bin/env bash
#
# Smoke tests for storybook-screenshot.py.
# Per skill-standards § 1: CLI wrappers get smoke tests covering --help,
# bad inputs, and dry-run paths.
#
# Run: bash .agents/skills/horizon-standard/scripts/tests/storybook-screenshot.test.sh
# Exit 0 = all tests pass. Exit 1 = at least one test failed.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT="$SCRIPT_DIR/storybook-screenshot.py"

if [[ ! -f "$SCRIPT" ]]; then
  echo "FAIL: script not found at $SCRIPT" >&2
  exit 1
fi

PASS=0
FAIL=0

assert_eq() {
  local expected="$1" actual="$2" label="$3"
  if [[ "$expected" == "$actual" ]]; then
    PASS=$((PASS + 1))
    echo "  pass: $label"
  else
    FAIL=$((FAIL + 1))
    echo "  FAIL: $label (expected $expected, got $actual)" >&2
  fi
}

assert_contains() {
  local needle="$1" haystack="$2" label="$3"
  if [[ "$haystack" == *"$needle"* ]]; then
    PASS=$((PASS + 1))
    echo "  pass: $label"
  else
    FAIL=$((FAIL + 1))
    echo "  FAIL: $label (output did not contain $needle)" >&2
  fi
}

# 1. --help exits 0 and lists key flags.
echo "test: --help exits cleanly and lists key flags"
set +e
help_output=$(python3 "$SCRIPT" --help 2>&1)
help_status=$?
set -e
assert_eq "0" "$help_status" "--help exit status"
assert_contains "--story" "$help_output" "--help advertises --story"
assert_contains "--all" "$help_output" "--help advertises --all"
assert_contains "--out-dir" "$help_output" "--help advertises --out-dir"
assert_contains "--viewport" "$help_output" "--help advertises --viewport"

# 2. No story selectors → exit 2 with actionable error.
echo "test: missing --story / --all -> exit 2"
set +e
no_args_output=$(python3 "$SCRIPT" 2>&1)
no_args_status=$?
set -e
assert_eq "2" "$no_args_status" "no-args exit status"
assert_contains "--story" "$no_args_output" "no-args error mentions --story"

# 3. --filter requires --all.
echo "test: --filter without --all -> exit 2"
set +e
filter_output=$(python3 "$SCRIPT" --story foo --filter components- 2>&1)
filter_status=$?
set -e
assert_eq "2" "$filter_status" "--filter w/o --all exit status"
assert_contains "--filter" "$filter_output" "--filter error mentions the flag"

# 4. Invalid --viewport format → exit 2.
echo "test: invalid --viewport -> exit 2"
set +e
viewport_output=$(python3 "$SCRIPT" --story foo --viewport bogus 2>&1)
viewport_status=$?
set -e
assert_eq "2" "$viewport_status" "invalid --viewport exit status"
assert_contains "--viewport" "$viewport_output" "viewport error mentions the flag"

# 5. Unreachable Storybook with --all → exit 3 with actionable hint.
echo "test: --all against unreachable URL -> exit 3 with actionable error"
set +e
unreachable_output=$(python3 "$SCRIPT" --all --storybook-url http://127.0.0.1:1 2>&1)
unreachable_status=$?
set -e
assert_eq "3" "$unreachable_status" "unreachable storybook exit status"
assert_contains "Start Storybook" "$unreachable_output" "unreachable error suggests starting Storybook"

# 6. --list-only with explicit --story names them and exits 0 without launching Playwright.
echo "test: --list-only is a no-op dry run"
set +e
list_output=$(python3 "$SCRIPT" --story alpha --story beta --list-only 2>&1)
list_status=$?
set -e
assert_eq "0" "$list_status" "--list-only exit status"
assert_contains "alpha" "$list_output" "--list-only includes alpha"
assert_contains "beta" "$list_output" "--list-only includes beta"

# 7. Dedupe: repeated --story should appear once via --list-only.
echo "test: duplicate --story values dedupe"
set +e
dedupe_output=$(python3 "$SCRIPT" --story foo --story foo --list-only 2>&1)
set -e
foo_count=$(printf "%s\n" "$dedupe_output" | grep -c '^foo$' || true)
assert_eq "1" "$foo_count" "duplicate --story foo dedupes to single line"

# Summary.
echo ""
echo "passes: $PASS"
echo "failures: $FAIL"
exit $((FAIL == 0 ? 0 : 1))
