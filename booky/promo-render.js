// Canonical Booky author promo — from github.com/lifewithchevy/booky-assets
// Renders the 9:16 SVG share asset (dark plum, filigree corners, gold tiles).

function escXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {object} opts
 * @param {string} opts.cover — image URL (local path or https)
 * @param {string} opts.title
 * @param {string} opts.author
 * @param {string} [opts.teaser]
 * @param {string} [opts.ctaText]
 * @param {string} [opts.ctaHref]
 */
function renderBookyPromoSVG(opts) {
  const cover = escXml(opts.cover || '');
  const title = escXml(opts.title || '');
  const author = escXml(opts.author || '');
  const teaser = escXml(opts.teaser || "today's word is hidden in...");
  const ctaText = escXml(opts.ctaText || 'PLAY NOW');
  const ctaHref = escXml(opts.ctaHref || 'https://90books.com/booky');

  return `<svg width="100%" viewBox="0 0 680 1210" role="img" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-label="Booky promo for ${title}">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d1126"/><stop offset="0.55" stop-color="#2a1632"/><stop offset="1" stop-color="#160c1d"/></linearGradient>
<clipPath id="coverclip"><rect x="190" y="388" width="300" height="450" rx="8"/></clipPath>
</defs>
<rect x="0" y="0" width="680" height="1210" fill="url(#bg)"/>
<ellipse cx="340" cy="613" rx="202" ry="255" fill="#cf3f86" opacity="0.15"/>
<ellipse cx="340" cy="613" rx="144" ry="195" fill="#d8b06a" opacity="0.07"/>
<rect x="28" y="28" width="624" height="1154" rx="16" fill="none" stroke="#d8b06a" stroke-width="3"/>
<g transform="translate(72,72) rotate(135)"><path d="M0,0 C 8,-13 26,-15 37,-8 C 47,-2 42,9 33,6" fill="none" stroke="#d8b06a" stroke-width="3"/><path d="M0,0 C -8,-13 -26,-15 -37,-8 C -47,-2 -42,9 -33,6" fill="none" stroke="#d8b06a" stroke-width="3"/><path d="M0,-4 L4,0 L0,4 L-4,0 Z" fill="#d8b06a"/><circle cx="37" cy="2" r="1.4" fill="#e6c887"/><circle cx="-37" cy="2" r="1.4" fill="#e6c887"/></g>
<g transform="translate(608,72) rotate(-135)"><path d="M0,0 C 8,-13 26,-15 37,-8 C 47,-2 42,9 33,6" fill="none" stroke="#d8b06a" stroke-width="3"/><path d="M0,0 C -8,-13 -26,-15 -37,-8 C -47,-2 -42,9 -33,6" fill="none" stroke="#d8b06a" stroke-width="3"/><path d="M0,-4 L4,0 L0,4 L-4,0 Z" fill="#d8b06a"/><circle cx="37" cy="2" r="1.4" fill="#e6c887"/><circle cx="-37" cy="2" r="1.4" fill="#e6c887"/></g>
<g transform="translate(72,1138) rotate(45)"><path d="M0,0 C 8,-13 26,-15 37,-8 C 47,-2 42,9 33,6" fill="none" stroke="#d8b06a" stroke-width="3"/><path d="M0,0 C -8,-13 -26,-15 -37,-8 C -47,-2 -42,9 -33,6" fill="none" stroke="#d8b06a" stroke-width="3"/><path d="M0,-4 L4,0 L0,4 L-4,0 Z" fill="#d8b06a"/><circle cx="37" cy="2" r="1.4" fill="#e6c887"/><circle cx="-37" cy="2" r="1.4" fill="#e6c887"/></g>
<g transform="translate(608,1138) rotate(-45)"><path d="M0,0 C 8,-13 26,-15 37,-8 C 47,-2 42,9 33,6" fill="none" stroke="#d8b06a" stroke-width="3"/><path d="M0,0 C -8,-13 -26,-15 -37,-8 C -47,-2 -42,9 -33,6" fill="none" stroke="#d8b06a" stroke-width="3"/><path d="M0,-4 L4,0 L0,4 L-4,0 Z" fill="#d8b06a"/><circle cx="37" cy="2" r="1.4" fill="#e6c887"/><circle cx="-37" cy="2" r="1.4" fill="#e6c887"/></g>
<path d="M340,138 A12,12 0 1,0 340,162 A8.5,8.5 0 1,1 340,138 Z" fill="#e6c887"/>
<rect x="198" y="198" width="48" height="50" rx="8" fill="#2c1a36" stroke="#d8b06a" stroke-width="3"/><rect x="257" y="198" width="48" height="50" rx="8" fill="#2c1a36" stroke="#d8b06a" stroke-width="3"/><rect x="316" y="198" width="48" height="50" rx="8" fill="#2c1a36" stroke="#d8b06a" stroke-width="3"/><rect x="375" y="198" width="48" height="50" rx="8" fill="#2c1a36" stroke="#d8b06a" stroke-width="3"/><rect x="434" y="198" width="48" height="50" rx="8" fill="#2c1a36" stroke="#d8b06a" stroke-width="3"/>
<text x="222" y="232" font-size="28" fill="#d8b06a" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif">B</text><text x="281" y="232" font-size="28" fill="#d8b06a" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif">O</text><text x="340" y="232" font-size="28" fill="#d8b06a" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif">O</text><text x="399" y="232" font-size="28" fill="#d8b06a" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif">K</text><text x="458" y="232" font-size="28" fill="#d8b06a" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif">Y</text>
<text x="340" y="282" font-size="15" fill="#b496ac" text-anchor="middle" letter-spacing="4" font-family="Georgia, serif">romantasy word game</text>
<g transform="translate(340,310) scale(0.6)"><path d="M0,0 C 8,-13 26,-15 37,-8 C 47,-2 42,9 33,6" fill="none" stroke="#d8b06a" stroke-width="5"/><path d="M0,0 C -8,-13 -26,-15 -37,-8 C -47,-2 -42,9 -33,6" fill="none" stroke="#d8b06a" stroke-width="5"/><path d="M0,-4 L4,0 L0,4 L-4,0 Z" fill="#d8b06a"/><circle cx="37" cy="2" r="2.2" fill="#e6c887"/><circle cx="-37" cy="2" r="2.2" fill="#e6c887"/></g>
<text x="340" y="370" font-size="22" fill="#ec84bd" text-anchor="middle" font-style="italic" font-family="Georgia, 'Times New Roman', serif">${teaser}</text>
<image href="${cover}" xlink:href="${cover}" x="190" y="388" width="300" height="450" preserveAspectRatio="xMidYMid slice" clip-path="url(#coverclip)"/>
<rect x="190" y="388" width="300" height="450" rx="8" fill="none" stroke="#d8b06a" stroke-width="3"/>
<text x="340" y="890" font-size="40" fill="#f3e3ee" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif">${title}</text>
<text x="340" y="928" font-size="22" fill="#c3a6bc" text-anchor="middle" font-family="Georgia, serif">${author}</text>
<a href="${ctaHref}" target="_blank" rel="noopener">
<rect x="160" y="960" width="360" height="62" rx="16" fill="#cf3f86"/>
<text x="340" y="1001" font-size="22" fill="#f0d9a0" text-anchor="middle" letter-spacing="3" font-family="Georgia, 'Times New Roman', serif">${ctaText}</text>
</a>
<g transform="translate(340,1112) scale(0.6)"><path d="M0,0 C 8,-13 26,-15 37,-8 C 47,-2 42,9 33,6" fill="none" stroke="#d8b06a" stroke-width="5"/><path d="M0,0 C -8,-13 -26,-15 -37,-8 C -47,-2 -42,9 -33,6" fill="none" stroke="#d8b06a" stroke-width="5"/><path d="M0,-4 L4,0 L0,4 L-4,0 Z" fill="#d8b06a"/><circle cx="37" cy="2" r="2.2" fill="#e6c887"/><circle cx="-37" cy="2" r="2.2" fill="#e6c887"/></g>
<text x="340" y="1076" font-size="13" fill="#9c7f95" text-anchor="middle" letter-spacing="2" font-family="Georgia, serif">daily romantasy word game by 90books</text>
</svg>`;
}

window.renderBookyPromoSVG = renderBookyPromoSVG;
