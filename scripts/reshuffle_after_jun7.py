#!/usr/bin/env python3
"""Set Jun 7 = STARS (A Court of Mist and Fury) and randomly reshuffle every
day after Jun 7, with the quality guard that no two consecutive days map to the
same book. Preserves the wordBooks block byte-for-byte (only the queue array is
rewritten)."""
import json, re, random
from datetime import date
from collections import Counter

PATH = 'booky/words.json'
text = open(PATH).read()
data = json.loads(text)
wb = data['wordBooks']
book = lambda w: wb.get(w, {}).get('slug', w)  # slug == book identity

q = data['queue']
y, m, dd = map(int, data['epoch'].split('-'))
epoch = date(y, m, dd)
JUN7 = (date(2026, 6, 7) - epoch).days  # queue index for Jun 7

head = q[:JUN7]            # Jun 6 and earlier — untouched
displaced = q[JUN7]        # current Jun 7 word (THORN) — fold into the tail pool
tail = q[JUN7 + 1:]        # Jun 8 onward

# STARS moves to Jun 7, so drop its existing later occurrence; keep the
# displaced word in the pool so the schedule length and word set stay intact.
if 'STARS' in tail:
    tail.remove('STARS')
tail.append(displaced)

def valid(seq, prev_book):
    pb = prev_book
    for w in seq:
        if book(w) == pb:
            return False
        pb = book(w)
    return True

# True random shuffle, rejection-sampled until no two adjacent days share a book
# (boundary: the day before is STARS -> A Court of Mist and Fury).
random.seed()
prev = book('STARS')
shuffled = None
for _ in range(20000):
    cand = tail[:]
    random.shuffle(cand)
    if valid(cand, prev):
        shuffled = cand
        break

# Fallback: greedy most-frequent-book-first (guarantees a valid arrangement).
if shuffled is None:
    remaining = tail[:]
    shuffled = []
    pb = prev
    while remaining:
        choices = [w for w in remaining if book(w) != pb] or remaining
        cnt = Counter(book(w) for w in remaining)
        random.shuffle(choices)
        choices.sort(key=lambda w: -cnt[book(w)])
        w = choices[0]
        shuffled.append(w)
        remaining.remove(w)
        pb = book(w)

new_q = head + ['STARS'] + shuffled

# Safety checks
assert len(new_q) == len(q), (len(new_q), len(q))
assert len(set(new_q)) == len(new_q), 'duplicate word in queue'
assert new_q[JUN7] == 'STARS'
adj = [(new_q[i], new_q[i+1]) for i in range(len(new_q)-1)
       if book(new_q[i]) == book(new_q[i+1])]

# Rewrite only the queue array; leave wordBooks untouched.
block = '"queue": [\n' + ',\n'.join('    "%s"' % w for w in new_q) + '\n  ]'
new_text = re.sub(r'"queue": \[.*?\n  \]', block, text, count=1, flags=re.S)
open(PATH, 'w').write(new_text)

print('Jun 7 =', new_q[JUN7])
print('queue len:', len(new_q), ' unique:', len(set(new_q)))
print('adjacent same-book pairs:', adj)
print('\\nSchedule Jun 7 - Jun 20:')
for off in range(0, 14):
    i = JUN7 + off
    if i < len(new_q):
        w = new_q[i]
        print(' ', (date(2026,6,7)).fromordinal(date(2026,6,7).toordinal()+off).isoformat(),
              w, '->', wb.get(w, {}).get('title', '(no book)'))
