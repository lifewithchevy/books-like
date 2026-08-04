// lib/giveaway-emails.js — the two giveaway result emails, in one place.
//
// Shared by scripts/giveaway-draw.mjs (preview + local send) and
// api/booky-giveaway.js (the live send, which runs on Vercel where the Resend
// keys actually are). One copy of the wording, so a preview is proof of what
// gets sent.
//
// House rules baked in here: no em-dashes in reader-facing copy, and the voice
// is a reader typing on their phone (sentence-case starts, caps for emphasis).
//
// CommonJS on purpose: api/ is CJS, and the ESM script imports it as a default.

// Days the winner has to reply with a shipping address before a redraw.
const CLAIM_DAYS = 7;

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ASIN comes out of the cover URL (.../P/<asin>.01.LZZZZZZZ.jpg), so the buy
// link can never point at a different book than the card showed.
function buyUrl(ga, amzTag = '90books-20') {
  const asin = (ga.cover || '').match(/\/P\/([A-Z0-9]{10})\./);
  const sub = `ascsubtag=booky-email-${encodeURIComponent(ga.tag || 'giveaway')}`;
  return asin
    ? `https://www.amazon.com/dp/${asin[1]}?tag=${amzTag}&${sub}`
    : `https://www.amazon.com/s?k=${encodeURIComponent(ga.title)}&tag=${amzTag}&${sub}`;
}

const PLAY_URL = 'https://90books.com/booky'
  + '?utm_source=giveaway_result&utm_medium=email'
  + '&utm_campaign=nyaxia_giveaway&utm_content=result_email';

// Resend stores the streak in first_name and the entry tag in last_name, so no
// real name is ever collected. Best available is the email local part.
function displayName(email) {
  const local = String(email).split('@')[0].replace(/[._+-]+/g, ' ').trim();
  return local.split(' ')[0].replace(/^./, (c) => c.toUpperCase()) || 'you';
}

function claimByDate(days = CLAIM_DAYS) {
  return new Date(Date.now() + days * 864e5)
    .toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

// ------------------------------------------------------------------ winner

// The winner email is deliberately PLAIN. It goes to one person, so it should
// look like one person wrote it: no card, no cover, no button, no gradient, no
// unsubscribe footer. Gmail files template-shaped mail with rewritten tracking
// links under Promotions, and a giveaway winner should not have to dig for it.
// Minimal inline styling only, so it still reads well in an HTML client.
function winnerEmailPlain({ ga, winnerName, claimDays = CLAIM_DAYS }) {
  const claimBy = claimByDate(claimDays);
  const lines = [
    `${winnerName} you won!! 🎉`,
    `I put every single entry in and pulled one at random and it was yours. You're getting a hardcover of ${ga.title} by ${ga.author}, which (perfect timing honestly) comes out today.`,
    `Just hit reply with your name, address and country and I'll order it from your local Amazon so it actually turns up fast instead of sitting in customs for three weeks. That's the whole thing.`,
    `One thing I feel a bit weird saying but I have to: if I don't hear back from you by ${claimBy} I'll have to draw someone else. Genuinely not rushing you, I just don't want the book sitting in limbo while someone else could have it.`,
    `Anyway congrats, and thank you for playing. It honestly means a lot that people entered at all.`,
    `Olga`,
    `(Booky, the daily romantasy word game · 90books.com/booky)`,
  ];
  const text = lines.join('\n\n');
  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#222;">`
    + lines.map((l, i) =>
        `<p style="margin:0 0 16px;${i === lines.length - 1 ? 'font-size:13px;color:#777;' : ''}">${esc(l)}</p>`
      ).join('')
    + `</div>`;
  return { subject: `you won the Booky giveaway 🎉`, text, html };
}

function winnerEmail({ ga, winnerName, claimDays = CLAIM_DAYS }) {
  const claimBy = claimByDate(claimDays);
  const body = [
    `${winnerName} YOU WON!! 🎉`,
    `Okay so I put every single entry in and pulled one at random and it was YOURS. You're getting a hardcover of <b>${esc(ga.title)}</b>, which (perfect timing honestly) comes out TODAY 😭`,
    `So the boring bit: just hit reply with your name, address and country and I'll order it from your local Amazon so it actually turns up fast instead of sitting in customs for three weeks. That's it, that's the whole thing.`,
    `One thing I feel a bit weird saying but I have to: if I don't hear back from you by <b>${claimBy}</b> I'll have to draw someone else 😬 Genuinely NOT rushing you, I just don't want the book sitting in limbo while someone else could have it.`,
    `Anyway CONGRATS 🎉 and thank you for playing, it honestly means a lot that people entered at all 💜`,
    `Olga`,
  ];
  return {
    subject: `YOU WON!! 🎉`,
    html: shell({
      ga,
      eyebrow: 'You won',
      body,
      cta: { label: `Play today's Booky →`, url: PLAY_URL },
      cover: ga.cover,
      coverTitle: 'Yours, out today',
      coverAfter: 1,
      // No buy button and no affiliate link: their copy is already paid for.
      cardButton: false,
    }),
    text: plain(body, PLAY_URL),
  };
}

// ------------------------------------------------------------------ list

function listEmail({ ga, winnerName, entries, amzTag }) {
  const BUY = buyUrl(ga, amzTag);
  const body = [
    `Okay, the first Booky giveaway has a WINNER 🎉`,
    `I pulled one reader at random and it was <b>${esc(winnerName)}</b>, so they're getting a hardcover of <b>${esc(ga.title)}</b> by ${esc(ga.author)}, which comes out today. Congrats to them, genuinely! 💜`,
    `And thank you to everyone who entered. This was the first one I've ever run and honestly I wasn't sure anyone would, so it meant a lot 🙏`,
    `And if you missed it, it's Crowns of Nyaxia book #5 and the first of a brand new duet, following two new MCs, Kyrene and Septimus, that I can't wait to read about (especially the hot scene that Carissa nicely shared in her newsletter, iykyk 😜). Out today in hardcover, and it's on KINDLE UNLIMITED too 👀`,
    `If you grab it through the link up there, Amazon kicks a few cents back to me at no extra cost to you, and that's genuinely the entire budget behind these giveaways 😅 No pressure either way!!`,
    `This giveaway was a total success so there'll be MORE, the next one kicks off later in August, keep an eye out 👀 And keep that streak warm.`,
    `Olga`,
  ];
  return {
    subject: `We have a WINNER 🎉 (and the book's out today)`,
    html: shell({
      ga,
      eyebrow: 'Giveaway result',
      body,
      cta: { label: `Play today's Booky →`, url: PLAY_URL },
      cover: ga.cover,
      coverTitle: `Out today, ${ga.announce}`,
      // After the congrats and thank-you beats, so those two stay together and
      // the card leads straight into the pitch for the book.
      coverAfter: 2,
      cardButton: true,
      buy: BUY,
      disclosure: true,
    }),
    text: plain(body, `Get it on Amazon: ${BUY}\n\nPlay today's Booky: ${PLAY_URL}`),
  };
}

// ------------------------------------------------------------------ render

// Strip tags AND decode the entities esc() introduced, otherwise the plain-text
// part shows "The Lion &amp; the Deathless Dark" to anyone reading text-only.
function plain(body, url) {
  const unesc = (s) => s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"');
  return body.map((p) => unesc(p.replace(/<[^>]+>/g, ''))).join('\n\n')
    + `\n\n${url}\n\n---\nBooky by 90books · you signed up at 90books.com/booky · reply to unsubscribe`;
}

// Card look matches api/booky-send.js and the entry confirmation so every Booky
// email reads as the same sender. Tables, not flex, because of Outlook.
function shell({ ga, eyebrow, body, cta, secondary, cover, coverTitle, coverAfter, cardButton, buy, disclosure }) {
  // Vertical card: large cover on top, then title, author, date and (on the
  // announcement only) the buy button. The winner's card is not a sponsored
  // link, so its cover and title are plain text.
  const linkOpen = cardButton ? `<a href="${esc(buy)}" rel="noopener sponsored" style="text-decoration:none;color:#2a0a26">` : '';
  const linkClose = cardButton ? '</a>' : '';
  const coverBlock = cover ? `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fdf6e9;border:1px solid #e8d4a8;border-radius:10px;margin:0 0 20px;">
            <tr><td align="center" style="padding:24px 20px;">
              ${linkOpen}<img src="${esc(cover)}" width="180" alt="${esc(ga.title)}" style="display:block;width:180px;max-width:70%;height:auto;border-radius:6px;border:0;margin:0 auto;" />${linkClose}
              ${linkOpen}<div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:22px;font-weight:600;color:#2a0a26;line-height:1.2;margin-top:18px;">${esc(ga.title)}</div>${linkClose}
              <div style="font-size:14px;color:#6a4a6c;margin-top:5px;">${esc(ga.author)}</div>
              ${coverTitle ? `<div style="font-size:12px;color:#96700c;margin-top:8px;font-weight:600;letter-spacing:0.3px;">${esc(coverTitle)}</div>` : ''}
              ${cardButton ? `<a href="${esc(buy)}" rel="noopener sponsored" style="display:inline-block;margin-top:16px;background:linear-gradient(135deg,#c8398f,#9a2670);background-color:#c8398f;color:#ffffff;text-decoration:none;font-weight:600;padding:13px 26px;border-radius:10px;font-size:15px;white-space:nowrap;">Get it on Amazon &rarr;</a>` : ''}
            </td></tr>
          </table>` : '';

  const at = Number.isInteger(coverAfter) ? coverAfter : body.length - 1;
  const paras = body.map((p, i) =>
    `<p style="margin:0 0 ${i === body.length - 1 ? '24' : '16'}px;font-size:${i === 0 ? '18px;font-weight:600;color:#2a0a26' : '15px;color:#4a2a4c'};line-height:1.6;">${p}</p>`
    + (cover && i === at ? coverBlock : '')
  ).join('\n          ');

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(eyebrow)}</title></head>
<body style="margin:0;padding:0;background:#fff8fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,sans-serif;color:#2a0a26;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fff8fb;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;background:#ffffff;border:1px solid #ead4e2;border-radius:14px;padding:32px 28px;">
        <tr><td>
          <p style="font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;font-weight:600;color:#c8398f;margin:0 0 4px;letter-spacing:0.5px;">Booky</p>
          <p style="margin:0 0 24px;color:#a587a9;font-size:11px;letter-spacing:2.5px;text-transform:uppercase;">${esc(eyebrow)}</p>
          ${paras}
          <a href="${esc(cta.url)}" style="display:inline-block;background:linear-gradient(135deg,#c8398f,#9a2670);background-color:#c8398f;color:#ffffff;text-decoration:none;font-weight:600;padding:13px 28px;border-radius:10px;font-size:15px;">${esc(cta.label)}</a>
          ${secondary ? `<p style="margin:18px 0 0;font-size:14px;"><a href="${esc(secondary.url)}" style="color:#c8398f;text-decoration:none;font-weight:600;">${esc(secondary.label)}</a></p>` : ''}
          <hr style="border:none;border-top:1px solid #ead4e2;margin:28px 0 18px;">
          <p style="margin:0;font-size:11px;color:#a587a9;line-height:1.6;">
            ${disclosure ? 'The book link is an Amazon affiliate link, so a purchase may earn me a few cents at no cost to you.<br>' : ''}
            Booky by 90books &middot; you signed up at 90books.com/booky.<br>
            <a href="mailto:hello@90books.com?subject=unsubscribe" style="color:#a587a9;text-decoration:underline;">Unsubscribe</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

module.exports = { winnerEmail, winnerEmailPlain, listEmail, displayName, buyUrl, claimByDate, CLAIM_DAYS, PLAY_URL };
