/**
 * Generates public/og-image.png — the 1200x630 card shown when a StudyHub link
 * is pasted into WhatsApp, X, LinkedIn, Slack, iMessage etc.
 *
 * Run: node scripts/generate-og-image.cjs
 *
 * Kept as a committed script rather than a build step: the image changes only
 * when the brand does, and regenerating it on every build would churn a binary
 * file in git for no reason.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const OUT = path.join(__dirname, '..', 'public', 'og-image.png');
const W = 1200;
const H = 630;

// The mark from favicon.svg, re-laid out for a wide card. Colours are the
// literal brand values — this file is not part of the themed runtime, so it
// cannot read the CSS custom properties.
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"  stop-color="#0f1319"/>
      <stop offset="100%" stop-color="#0b0d10"/>
    </linearGradient>
    <linearGradient id="mark" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"  stop-color="#1d4ed8"/>
      <stop offset="100%" stop-color="#3b82f6"/>
    </linearGradient>
    <linearGradient id="word" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"  stop-color="#60a5fa"/>
      <stop offset="100%" stop-color="#93c5fd"/>
    </linearGradient>
    <!-- Feathered falloff. A flat-fill circle at low opacity reads as a hard
         disc once the PNG is quantised, not as a glow. -->
    <radialGradient id="glow">
      <stop offset="0%"   stop-color="#3b82f6" stop-opacity="0.16"/>
      <stop offset="55%"  stop-color="#3b82f6" stop-opacity="0.07"/>
      <stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>

  <circle cx="1010" cy="120" r="300" fill="url(#glow)"/>
  <circle cx="150"  cy="560" r="240" fill="url(#glow)"/>

  <!-- hub-and-node mark -->
  <g transform="translate(96,150)">
    <rect width="132" height="132" rx="30" fill="url(#mark)"/>
    <g transform="translate(66,66)" stroke="#ffffff" stroke-width="4.6" stroke-linecap="round" opacity="0.95">
      <line x1="0" y1="0" x2="0"     y2="-33"/>
      <line x1="0" y1="0" x2="-28.6" y2="16.5"/>
      <line x1="0" y1="0" x2="28.6"  y2="16.5"/>
    </g>
    <g transform="translate(66,66)" fill="#ffffff">
      <circle cx="0"     cy="0"     r="11.9"/>
      <circle cx="0"     cy="-33"   r="8.6"/>
      <circle cx="-28.6" cy="16.5"  r="8.6"/>
      <circle cx="28.6"  cy="16.5"  r="8.6"/>
    </g>
  </g>

  <text x="262" y="242" font-family="Plus Jakarta Sans, DejaVu Sans, Verdana, sans-serif"
        font-size="76" font-weight="800" fill="url(#word)">StudyHub</text>

  <text x="96" y="372" font-family="DejaVu Sans, Verdana, sans-serif"
        font-size="42" font-weight="600" fill="#f1f3f5">Learn together. Grow together.</text>

  <text x="96" y="436" font-family="DejaVu Sans, Verdana, sans-serif"
        font-size="29" fill="#9aa3af">Study groups · Shared notes · Q&amp;A · Verified tutors</text>

  <rect x="96" y="492" width="440" height="64" rx="32" fill="#2563eb"/>
  <text x="316" y="533" font-family="DejaVu Sans, Verdana, sans-serif" font-size="25"
        font-weight="700" fill="#ffffff" text-anchor="middle">Join free — no card needed</text>
</svg>`;

// No `palette: true`: 8-bit quantisation bands the gradients into visible rings.
sharp(Buffer.from(svg))
    .png({ compressionLevel: 9 })
    .toFile(OUT)
    .then(info => {
        const kb = (fs.statSync(OUT).size / 1024).toFixed(1);
        console.log(`og-image.png  ${info.width}x${info.height}  ${kb} KB`);
    })
    .catch(err => {
        console.error('Failed to generate OG image:', err.message);
        process.exit(1);
    });
