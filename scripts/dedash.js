// One-off: replace em-dashes (—, &mdash;) with casual punctuation across copy.
// Keeps en-dashes (–) used in ranges. Only touches spaces/tabs around the dash,
// never newlines, so code indentation + line structure stay intact.
const fs = require('fs');

const files = ['index.html', 'middleware.js', 'seo-recs.mjs'];

for (const f of files) {
  let s = fs.readFileSync(f, 'utf8');

  // Normalize em-dash entities to the literal char first.
  s = s.replace(/&mdash;/g, '—').replace(/&#8212;/g, '—').replace(/&#x2014;/gi, '—');

  // Em-dash (+ surrounding spaces/tabs only) -> comma + space.
  s = s.replace(/[ \t]*—[ \t]*/g, ', ');

  // Cleanup artifacts (line-safe, no newline crossing):
  s = s.replace(/,[ \t]*,/g, ',');            // double comma -> single
  s = s.replace(/([.?!:;])[ \t]*,/g, '$1 ');  // comma right after sentence punctuation -> drop it
  s = s.replace(/,[ \t]*\)/g, ')');           // ", )" -> ")"
  s = s.replace(/\([ \t]*,[ \t]*/g, '(');     // "( ," -> "("

  fs.writeFileSync(f, s);
  const left = (s.match(/—/g) || []).length;
  console.log(`${f}: em-dashes remaining = ${left}`);
}
