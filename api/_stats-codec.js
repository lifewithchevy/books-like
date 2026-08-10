// api/_stats-codec.js — packs a player's Booky stats into the single Resend
// contact field we have available.
//
// Resend contacts expose exactly two writable string fields, `first_name` and
// `last_name`. `last_name` is spoken for: it holds the giveaway entry tag and
// is the only record of who entered a draw (see api/booky-subscribe.js). That
// leaves `first_name`, which historically held the streak as a bare number.
//
// Format: "current|max|played|wins|lastPlayedDay", e.g. "30|52|60|45|412".
//
// The current streak stays FIRST and bare on purpose: api/booky-send.js reads
// the field with parseInt(), which stops at the first "|", so every existing
// reader keeps working against the packed value without a change. Old contacts
// still holding a bare "30" decode fine too — missing fields come back null.
//
// Neither field is ever shown to a reader; both are internal storage.

const SEP = '|';

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) && x >= 0 ? Math.floor(x) : 0;
}

// stats -> "30|52|60|45|412"
function encodeStats(stats) {
  const s = stats || {};
  return [
    n(s.currentStreak),
    n(s.maxStreak),
    n(s.played),
    n(s.wins),
    n(s.lastPlayedDay),
  ].join(SEP);
}

// "30|52|60|45|412" (or legacy "30", or null) -> stats object.
// Fields absent from the stored value come back null so callers can tell
// "this player has no record of it" apart from "this player has zero".
function decodeStats(raw) {
  const parts = String(raw == null ? '' : raw).split(SEP);
  const at = (i) => {
    if (i >= parts.length) return null;
    // Number('') is 0, which would turn an empty field into a real zero and
    // let a blank contact "restore" a streak of 0 over live local stats.
    if (String(parts[i]).trim() === '') return null;
    const x = Number(parts[i]);
    return Number.isFinite(x) && x >= 0 ? Math.floor(x) : null;
  };
  return {
    currentStreak: at(0),
    maxStreak: at(1),
    played: at(2),
    wins: at(3),
    lastPlayedDay: at(4),
  };
}

// Leading integer only — for callers that just want the streak (CSV exports,
// email personalization) and must not leak the packed format.
function streakOf(raw) {
  const v = decodeStats(raw).currentStreak;
  return v == null ? 0 : v;
}

module.exports = { encodeStats, decodeStats, streakOf };
