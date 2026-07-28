#!/usr/bin/env python3
"""Guard: do not change today's word or any past queue slots.

Only dates strictly after today (local midnight, same rollover as booky/app.js)
may be edited. Exits non-zero and lists violations.

Usage:
  python3 scripts/validate_queue_lock.py
  python3 scripts/validate_queue_lock.py --baseline /path/to/words.json
  python3 scripts/validate_queue_lock.py --today 2026-07-28
"""
import argparse
import json
import subprocess
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORDS = ROOT / 'booky' / 'words.json'


def queue_day_index(epoch_str: str, today: date) -> int:
    y, m, d = map(int, epoch_str.split('-'))
    epoch = date(y, m, d)
    return (today - epoch).days


def load_json(path: Path) -> dict:
    return json.loads(path.read_text())


def load_baseline(path: str | None) -> dict:
    if path:
        return load_json(Path(path))
    proc = subprocess.run(
        ['git', 'show', 'origin/main:booky/words.json'],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        print('WARN: could not read origin/main baseline; skipping lock check')
        sys.exit(0)
    return json.loads(proc.stdout)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--baseline', help='Baseline words.json (default: origin/main)')
    parser.add_argument('--today', help='Override today YYYY-MM-DD (default: local date)')
    args = parser.parse_args()

    today = date.fromisoformat(args.today) if args.today else datetime.now().date()
    current = load_json(WORDS)
    baseline = load_baseline(args.baseline)

    if current['epoch'] != baseline['epoch']:
        print('FAIL: epoch changed — past/today lock assumes same epoch')
        return 1

    last_locked = queue_day_index(current['epoch'], today)  # inclusive: today
    cur_q = current['queue']
    base_q = baseline['queue']
    if len(cur_q) != len(base_q):
        print('FAIL: queue length changed while today/past slots must stay locked')
        return 1

    epoch = date.fromisoformat(current['epoch'])
    bad = []
    for i in range(0, last_locked + 1):
        if cur_q[i] != base_q[i]:
            d = epoch + timedelta(days=i)
            bad.append((d, i + 1, base_q[i], cur_q[i]))

    if bad:
        print(f"FAIL: {len(bad)} today/past slot(s) changed (locked through {today}):")
        for d, day_num, old, new in bad:
            tag = 'TODAY' if d == today else 'PAST'
            print(f"  {tag} {d} day {day_num}: {old} -> {new}")
        return 1

    print(f"OK: queue locked through {today} (day {last_locked + 1}, indices 0..{last_locked})")
    return 0


if __name__ == '__main__':
    sys.exit(main())
