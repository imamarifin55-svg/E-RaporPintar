/**
 * Default SVG Data URIs for Regional Government (Pemda) and School Logos
 */

export const DEFAULT_LOGO_PEMDA = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" width="100" height="120">
  <defs>
    <linearGradient id="gradPemda" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="%231e3a8a"/>
      <stop offset="100%" stop-color="%230284c7"/>
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="%23facc15"/>
      <stop offset="100%" stop-color="%23ca8a04"/>
    </linearGradient>
  </defs>
  <!-- Shield Outline -->
  <path d="M 50 5 Q 85 5 92 35 C 92 80 50 115 50 115 C 50 115 8 80 8 35 Q 15 5 50 5 Z" fill="url(%23gradPemda)" stroke="%23facc15" stroke-width="4"/>
  <!-- Inner Rim -->
  <path d="M 50 12 Q 78 12 84 37 C 84 73 50 105 50 105 C 50 105 16 73 16 37 Q 22 12 50 12 Z" fill="none" stroke="%23ffffff" stroke-width="1.5" stroke-dasharray="3,2"/>
  <!-- Gold Bintang Lima (Star) -->
  <polygon points="50,22 53,30 62,30 55,36 58,45 50,40 42,45 45,36 38,30 47,30" fill="url(%23goldGrad)"/>
  <!-- Padi & Kapas Wreath -->
  <path d="M 28 80 C 24 60 26 42 35 34" fill="none" stroke="%23facc15" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M 72 80 C 76 60 74 42 65 34" fill="none" stroke="%2322c55e" stroke-width="2.5" stroke-linecap="round"/>
  <!-- Center Monolith / Tugu -->
  <path d="M 47 48 L 53 48 L 55 76 L 45 76 Z" fill="%23ffffff"/>
  <polygon points="50,42 54,48 46,48" fill="%23facc15"/>
  <rect x="42" y="76" width="16" height="5" rx="1" fill="%23facc15"/>
  <rect x="38" y="81" width="24" height="4" rx="1" fill="%23e2e8f0"/>
  <!-- Water Waves at bottom -->
  <path d="M 30 89 Q 40 85 50 89 T 70 89" fill="none" stroke="%23ffffff" stroke-width="2"/>
  <!-- Ribbon banner -->
  <path d="M 22 98 L 78 98 L 74 106 L 50 103 L 26 106 Z" fill="%23dc2626"/>
  <text x="50" y="103" font-size="5" font-family="Arial, sans-serif" font-weight="bold" fill="%23ffffff" text-anchor="middle">PEMERINTAH DAERAH</text>
</svg>`;

export const DEFAULT_LOGO_SEKOLAH = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" width="100" height="120">
  <defs>
    <linearGradient id="schoolGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="%231d4ed8"/>
      <stop offset="100%" stop-color="%231e40af"/>
    </linearGradient>
    <linearGradient id="torchGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="%23ef4444"/>
      <stop offset="50%" stop-color="%23f97316"/>
      <stop offset="100%" stop-color="%23eab308"/>
    </linearGradient>
  </defs>
  <!-- Circular Segi Lima (Pentagon) Frame -->
  <polygon points="50,5 95,38 78,92 22,92 5,38" fill="%23ffffff" stroke="%231d4ed8" stroke-width="4"/>
  <polygon points="50,11 88,40 73,86 27,86 12,40" fill="url(%23schoolGrad)"/>
  <!-- Sayap Pendidikan (Wings) -->
  <path d="M 50 65 C 35 60 20 50 18 36 C 26 44 38 48 50 56 Z" fill="%23facc15"/>
  <path d="M 50 65 C 65 60 80 50 82 36 C 74 44 62 48 50 56 Z" fill="%23facc15"/>
  <!-- Open Book (Buku Terbuka) -->
  <path d="M 50 68 C 42 62 30 62 24 65 L 24 77 C 32 74 42 74 50 80 C 58 74 68 74 76 77 L 76 65 C 70 62 58 62 50 68 Z" fill="%23ffffff" stroke="%23cbd5e1" stroke-width="1"/>
  <!-- Torch flame (Api Obor Pendidikan) -->
  <path d="M 50 24 C 54 30 57 33 55 38 C 53 43 47 43 45 38 C 43 33 46 30 50 24 Z" fill="url(%23torchGrad)"/>
  <!-- Torch handle -->
  <polygon points="48,40 52,40 51,52 49,52" fill="%23f8fafc"/>
  <ellipse cx="50" cy="52" rx="4" ry="2" fill="%23facc15"/>
  <!-- School Ribbon -->
  <path d="M 15 97 L 85 97 L 80 107 L 50 104 L 20 107 Z" fill="%23facc15"/>
  <text x="50" y="103" font-size="5" font-family="Arial, sans-serif" font-weight="bold" fill="%231e3a8a" text-anchor="middle">TUT WURI HANDAYANI</text>
</svg>`;
