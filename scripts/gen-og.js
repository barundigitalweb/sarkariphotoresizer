import sharp from 'sharp';
import fs from 'fs';

const svg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="50%" stop-color="#1e293b" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)" />

  <!-- Badge -->
  <rect x="410" y="80" width="380" height="42" rx="21" fill="#1e3a8a" stroke="#3b82f6" stroke-width="1.5" />
  <text x="600" y="107" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#93c5fd" text-anchor="middle" letter-spacing="2">
    100% FREE • NO SIGNUP • PRIVATE
  </text>

  <!-- Title -->
  <text x="600" y="200" font-family="Arial, sans-serif" font-size="52" font-weight="bold" fill="#ffffff" text-anchor="middle">
    Sarkari Photo &amp; Signature Resizer
  </text>

  <!-- Subtitle -->
  <text x="600" y="255" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#38bdf8" text-anchor="middle">
    Compress to Exact 20KB - 50KB &amp; 10KB - 20KB
  </text>

  <text x="600" y="300" font-family="Arial, sans-serif" font-size="18" fill="#94a3b8" text-anchor="middle">
    Calibrated for SSC, Railway RRB, UPSC, NTA NEET, Banking &amp; State Police Exams
  </text>

  <!-- Pill cards -->
  <rect x="130" y="370" width="280" height="110" rx="16" fill="#1e293b" stroke="#334155" stroke-width="2" />
  <text x="270" y="415" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#ffffff" text-anchor="middle">
    Passport Photo
  </text>
  <text x="270" y="450" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#34d399" text-anchor="middle">
    20 KB - 50 KB (3.5x4.5cm)
  </text>

  <rect x="460" y="370" width="280" height="110" rx="16" fill="#1e293b" stroke="#334155" stroke-width="2" />
  <text x="600" y="415" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#ffffff" text-anchor="middle">
    Signature Resizer
  </text>
  <text x="600" y="450" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#38bdf8" text-anchor="middle">
    10 KB - 20 KB (Auto-Clean)
  </text>

  <rect x="790" y="370" width="280" height="110" rx="16" fill="#1e293b" stroke="#334155" stroke-width="2" />
  <text x="930" y="415" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#ffffff" text-anchor="middle">
    Name &amp; Date (DOP)
  </text>
  <text x="930" y="450" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#fbbf24" text-anchor="middle">
    UPSC &amp; SSC Notice Compliant
  </text>

  <!-- Footer link -->
  <text x="600" y="555" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#64748b" text-anchor="middle">
    SarkariPhotoResizer.com • 100% Client-Side In-Browser Tool
  </text>
</svg>
`;

async function main() {
  await sharp(Buffer.from(svg))
    .jpeg({ quality: 90 })
    .toFile('public/og-image.jpg');
  console.log('og-image.jpg generated successfully!');
}

main().catch(console.error);
