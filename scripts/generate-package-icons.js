const fs = require('fs')
const path = require('path')

const TARGET_DIR = path.resolve(__dirname, '../frontend/public/images/packages')

if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true })
}

const icons = {
  // ─── 1. MOBILE LEGENDS (MLBB) ──────────────────────────────────────────────
  'mlbb-diamond-single.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <defs>
    <linearGradient id="mlbb-top" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#7df9ff"/>
      <stop offset="50%" stop-color="#00d2ff"/>
      <stop offset="100%" stop-color="#0080ff"/>
    </linearGradient>
    <linearGradient id="mlbb-mid" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>
    <linearGradient id="mlbb-bot-l" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0284c7"/>
      <stop offset="100%" stop-color="#0369a1"/>
    </linearGradient>
    <linearGradient id="mlbb-bot-c" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>
    <linearGradient id="mlbb-bot-r" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#075985"/>
      <stop offset="100%" stop-color="#0c4a6e"/>
    </linearGradient>
    <filter id="mlbb-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#00d2ff" flood-opacity="0.45"/>
    </filter>
  </defs>
  <g filter="url(#mlbb-glow)">
    <!-- Top Table Facet -->
    <polygon points="20,14 44,14 54,26 10,26" fill="url(#mlbb-top)"/>
    <!-- Top Kites -->
    <polygon points="10,26 20,14 24,26" fill="#bae6fd"/>
    <polygon points="24,26 32,14 40,26" fill="#e0f2fe"/>
    <polygon points="40,26 44,14 54,26" fill="#38bdf8"/>
    <!-- Bottom Facets -->
    <polygon points="10,26 24,26 32,54" fill="url(#mlbb-bot-l)"/>
    <polygon points="24,26 40,26 32,54" fill="url(#mlbb-bot-c)"/>
    <polygon points="40,26 54,26 32,54" fill="url(#mlbb-bot-r)"/>
    <!-- Specular Highlight Stars -->
    <path d="M22 18L24 14L26 18L30 20L26 22L24 26L22 22L18 20Z" fill="#ffffff" opacity="0.9"/>
    <circle cx="42" cy="22" r="1.5" fill="#ffffff" opacity="0.8"/>
  </g>
</svg>`,

  'mlbb-diamond-stack.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <defs>
    <linearGradient id="ml-blue-1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#7df9ff"/><stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>
    <linearGradient id="ml-blue-2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8"/><stop offset="100%" stop-color="#0369a1"/>
    </linearGradient>
    <filter id="stack-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#00d2ff" flood-opacity="0.5"/>
    </filter>
  </defs>
  <g filter="url(#stack-glow)">
    <!-- Back Left Diamond -->
    <g transform="translate(-4, 4) scale(0.7)">
      <polygon points="18,14 46,14 56,26 8,26" fill="#38bdf8" opacity="0.85"/>
      <polygon points="8,26 24,26 32,54" fill="#0284c7" opacity="0.85"/>
      <polygon points="24,26 40,26 32,54" fill="#7df9ff" opacity="0.85"/>
      <polygon points="40,26 56,26 32,54" fill="#0369a1" opacity="0.85"/>
    </g>
    <!-- Back Right Diamond -->
    <g transform="translate(20, 2) scale(0.72)">
      <polygon points="18,14 46,14 56,26 8,26" fill="#7df9ff" opacity="0.9"/>
      <polygon points="8,26 24,26 32,54" fill="#0284c7" opacity="0.9"/>
      <polygon points="24,26 40,26 32,54" fill="#bae6fd" opacity="0.9"/>
      <polygon points="40,26 56,26 32,54" fill="#0369a1" opacity="0.9"/>
    </g>
    <!-- Center Front Big Diamond -->
    <g transform="translate(6, 10) scale(0.85)">
      <polygon points="18,14 46,14 56,26 8,26" fill="url(#ml-blue-1)"/>
      <polygon points="8,26 24,26 32,54" fill="#0369a1"/>
      <polygon points="24,26 40,26 32,54" fill="#e0f2fe"/>
      <polygon points="40,26 56,26 32,54" fill="url(#ml-blue-2)"/>
      <!-- Sparkle -->
      <path d="M22 17L24 13L26 17L30 19L26 21L24 25L22 21L18 19Z" fill="#ffffff"/>
    </g>
  </g>
</svg>`,

  'mlbb-diamond-pile.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <defs>
    <radialGradient id="pile-aura" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#00d2ff" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#00d2ff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="32" cy="36" r="26" fill="url(#pile-aura)"/>
  <!-- Diamond Pile Group -->
  <g transform="translate(2, 6)">
    <!-- Base diamonds -->
    <polygon points="8,38 20,38 14,52" fill="#0284c7"/>
    <polygon points="18,34 32,34 25,50" fill="#0369a1"/>
    <polygon points="38,36 52,36 45,52" fill="#0284c7"/>
    <polygon points="28,38 42,38 35,54" fill="#075985"/>
    <!-- Middle tier -->
    <polygon points="14,24 30,24 22,40" fill="#38bdf8"/>
    <polygon points="30,24 46,24 38,40" fill="#7df9ff"/>
    <polygon points="22,28 38,28 30,46" fill="#bae6fd"/>
    <!-- Top Apex Diamond -->
    <polygon points="20,12 38,12 44,22 14,22" fill="#e0f2fe"/>
    <polygon points="14,22 24,22 29,38" fill="#38bdf8"/>
    <polygon points="24,22 36,22 29,38" fill="#ffffff"/>
    <polygon points="36,22 44,22 29,38" fill="#0284c7"/>
    <!-- Sparkles -->
    <path d="M12 18L13.5 15L15 18L18 19.5L15 21L13.5 24L12 21L9 19.5Z" fill="#ffffff"/>
    <path d="M46 14L47.5 11L49 14L52 15.5L49 17L47.5 20L46 17L43 15.5Z" fill="#ffffff"/>
    <circle cx="30" cy="8" r="1.5" fill="#ffffff"/>
  </g>
</svg>`,

  'mlbb-diamond-chest.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <defs>
    <linearGradient id="gold-trim" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/><stop offset="50%" stop-color="#eab308"/><stop offset="100%" stop-color="#a16207"/>
    </linearGradient>
    <linearGradient id="wood-chest" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#451a03"/><stop offset="100%" stop-color="#1e1b4b"/>
    </linearGradient>
  </defs>
  <!-- Chest Body -->
  <rect x="10" y="32" width="44" height="24" rx="4" fill="url(#wood-chest)" stroke="url(#gold-trim)" stroke-width="2"/>
  <rect x="29" y="38" width="6" height="8" rx="1.5" fill="url(#gold-trim)"/>
  <!-- Gold Bands -->
  <line x1="18" y1="32" x2="18" y2="56" stroke="url(#gold-trim)" stroke-width="2.5"/>
  <line x1="46" y1="32" x2="46" y2="56" stroke="url(#gold-trim)" stroke-width="2.5"/>
  <!-- Open Lid / Glow Overflow -->
  <path d="M6 30C12 18 52 18 58 30Z" fill="#00d2ff" opacity="0.3"/>
  <!-- Overflowing Diamonds -->
  <polygon points="16,22 28,22 22,34" fill="#00d2ff"/>
  <polygon points="26,14 40,14 33,28" fill="#7df9ff"/>
  <polygon points="36,20 48,20 42,32" fill="#38bdf8"/>
  <polygon points="22,26 34,26 28,38" fill="#bae6fd"/>
  <!-- Sparkles -->
  <path d="M33 8L35 4L37 8L41 10L37 12L35 16L33 12L29 10Z" fill="#ffffff"/>
  <circle cx="16" cy="14" r="2" fill="#7df9ff"/>
  <circle cx="50" cy="18" r="1.5" fill="#fef08a"/>
</svg>`,

  'mlbb-weekly-pass.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <defs>
    <linearGradient id="wp-card" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f2b60"/>
      <stop offset="50%" stop-color="#1e3a8a"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>
    <linearGradient id="wp-gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="50%" stop-color="#eab308"/>
      <stop offset="100%" stop-color="#b45309"/>
    </linearGradient>
    <filter id="wp-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.3"/>
    </filter>
  </defs>
  <!-- Card Container with Metallic Border -->
  <rect x="6" y="8" width="52" height="48" rx="8" fill="url(#wp-card)" stroke="url(#wp-gold)" stroke-width="2" filter="url(#wp-shadow)"/>
  <!-- Subtle Card Lines -->
  <path d="M12 16H52" stroke="#60a5fa" stroke-width="0.75" opacity="0.3"/>
  <path d="M12 48H52" stroke="#60a5fa" stroke-width="0.75" opacity="0.3"/>
  <!-- Top Gold Crown -->
  <path d="M25 15L28 19L32 14L36 19L39 15L37 23H27Z" fill="url(#wp-gold)"/>
  <!-- Center Big MLBB Diamond -->
  <polygon points="26,27 38,27 42,34 22,34" fill="#7df9ff"/>
  <polygon points="22,34 32,34 32,44" fill="#0284c7"/>
  <polygon points="32,34 42,34 32,44" fill="#bae6fd"/>
  <!-- "WEEKLY" Banner at bottom -->
  <rect x="14" y="44" width="36" height="8" rx="4" fill="url(#wp-gold)"/>
  <text x="32" y="50" font-family="system-ui, sans-serif" font-size="5.5" font-weight="900" fill="#1e293b" text-anchor="middle" letter-spacing="0.5">WEEKLY</text>
  <!-- 7 Days Indicator Dots/Stars -->
  <circle cx="16" cy="24" r="1.5" fill="#fef08a"/>
  <circle cx="48" cy="24" r="1.5" fill="#fef08a"/>
</svg>`,

  'mlbb-twilight-pass.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <defs>
    <linearGradient id="tw-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2e1065"/><stop offset="50%" stop-color="#581c87"/><stop offset="100%" stop-color="#7e22ce"/>
    </linearGradient>
    <linearGradient id="tw-gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/><stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
  </defs>
  <!-- Pass Shield/Card -->
  <rect x="6" y="8" width="52" height="48" rx="8" fill="url(#tw-bg)" stroke="url(#tw-gold)" stroke-width="2"/>
  <!-- Celestial Wings -->
  <path d="M12 28C18 20 26 24 32 30C38 24 46 20 52 28C44 32 38 34 32 40C26 34 20 32 12 28Z" fill="#c084fc" opacity="0.4"/>
  <!-- Violet/Magenta Star Prism -->
  <polygon points="26,22 38,22 43,30 21,30" fill="#f472b6"/>
  <polygon points="21,30 32,30 32,42" fill="#9333ea"/>
  <polygon points="32,30 43,30 32,42" fill="#e879f9"/>
  <!-- TWILIGHT Banner -->
  <rect x="12" y="44" width="40" height="8" rx="4" fill="url(#tw-gold)"/>
  <text x="32" y="50" font-family="system-ui, sans-serif" font-size="5" font-weight="900" fill="#2e1065" text-anchor="middle" letter-spacing="0.5">TWILIGHT</text>
</svg>`,

  'mlbb-monthly-pack.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <defs>
    <linearGradient id="mp-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e1b4b"/><stop offset="100%" stop-color="#4338ca"/>
    </linearGradient>
    <linearGradient id="mp-gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fde047"/><stop offset="100%" stop-color="#ca8a04"/>
    </linearGradient>
  </defs>
  <!-- Package Box with Ribbon -->
  <rect x="12" y="24" width="40" height="32" rx="6" fill="url(#mp-bg)" stroke="url(#mp-gold)" stroke-width="2"/>
  <!-- Vertical & Horizontal Ribbons -->
  <rect x="29" y="24" width="6" height="32" fill="url(#mp-gold)"/>
  <rect x="12" y="38" width="40" height="5" fill="url(#mp-gold)"/>
  <!-- Bow on top with glowing diamond -->
  <circle cx="32" cy="18" r="8" fill="#38bdf8" opacity="0.3"/>
  <polygon points="26,14 38,14 42,20 22,20" fill="#7df9ff"/>
  <polygon points="22,20 32,20 32,28" fill="#0284c7"/>
  <polygon points="32,20 42,20 32,28" fill="#bae6fd"/>
  <!-- MONTHLY text -->
  <rect x="16" y="46" width="32" height="7" rx="3.5" fill="#fef08a"/>
  <text x="32" y="51.5" font-family="system-ui, sans-serif" font-size="4.5" font-weight="900" fill="#1e1b4b" text-anchor="middle">MONTHLY</text>
</svg>`,

  // ─── 2. FREE FIRE (FF) ─────────────────────────────────────────────────────
  'freefire-diamond-single.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <defs>
    <linearGradient id="ff-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#67e8f9"/><stop offset="50%" stop-color="#06b6d4"/><stop offset="100%" stop-color="#0891b2"/>
    </linearGradient>
    <linearGradient id="ff-fire" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffedd5"/><stop offset="50%" stop-color="#f97316"/><stop offset="100%" stop-color="#dc2626"/>
    </linearGradient>
    <filter id="ff-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#06b6d4" flood-opacity="0.5"/>
    </filter>
  </defs>
  <g filter="url(#ff-glow)">
    <!-- Free Fire Rhombus / Brilliant Cut -->
    <polygon points="32,10 52,24 32,54 12,24" fill="#0891b2"/>
    <!-- Facets -->
    <polygon points="32,10 40,24 32,54" fill="#67e8f9"/>
    <polygon points="32,10 24,24 32,54" fill="#a5f3fc"/>
    <polygon points="12,24 24,24 32,54" fill="#0e7490"/>
    <polygon points="52,24 40,24 32,54" fill="#155e75"/>
    <polygon points="32,10 52,24 40,24" fill="#cffafe"/>
    <polygon points="32,10 12,24 24,24" fill="#e0f2fe"/>
    <!-- Free Fire Flame Sparkle Accent -->
    <path d="M42 16C43 14 45 13 46 11C47 13 49 14 50 16C49 17 48 18 46 19C44 18 43 17 42 16Z" fill="url(#ff-fire)"/>
    <circle cx="28" cy="20" r="1.5" fill="#ffffff"/>
  </g>
</svg>`,

  'freefire-diamond-stack.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <defs>
    <linearGradient id="ff-c1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#a5f3fc"/><stop offset="100%" stop-color="#0891b2"/>
    </linearGradient>
  </defs>
  <!-- Back Left -->
  <g transform="translate(6, 12) scale(0.65)">
    <polygon points="32,10 52,24 32,54 12,24" fill="#0e7490" opacity="0.8"/>
    <polygon points="32,10 40,24 32,54" fill="#67e8f9" opacity="0.8"/>
    <polygon points="32,10 24,24 32,54" fill="#a5f3fc" opacity="0.8"/>
  </g>
  <!-- Back Right -->
  <g transform="translate(24, 8) scale(0.7)">
    <polygon points="32,10 52,24 32,54 12,24" fill="#0891b2" opacity="0.9"/>
    <polygon points="32,10 40,24 32,54" fill="#cffafe" opacity="0.9"/>
    <polygon points="32,10 24,24 32,54" fill="#67e8f9" opacity="0.9"/>
  </g>
  <!-- Front Big Diamond -->
  <g transform="translate(8, 12) scale(0.8)">
    <polygon points="32,10 52,24 32,54 12,24" fill="#0e7490"/>
    <polygon points="32,10 40,24 32,54" fill="url(#ff-c1)"/>
    <polygon points="32,10 24,24 32,54" fill="#ffffff"/>
    <polygon points="12,24 24,24 32,54" fill="#0891b2"/>
    <polygon points="52,24 40,24 32,54" fill="#155e75"/>
    <!-- Fire Sparkle -->
    <path d="M44 14L46 11L48 14L51 15.5L48 17L46 20L44 17L41 15.5Z" fill="#f97316"/>
  </g>
</svg>`,

  'freefire-diamond-chest.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <defs>
    <linearGradient id="ff-chest-box" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1e293b"/><stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="ff-chest-orange" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fb923c"/><stop offset="100%" stop-color="#ea580c"/>
    </linearGradient>
  </defs>
  <!-- Tactical Crate Base -->
  <rect x="8" y="30" width="48" height="26" rx="4" fill="url(#ff-chest-box)" stroke="url(#ff-chest-orange)" stroke-width="2"/>
  <rect x="28" y="38" width="8" height="8" rx="2" fill="url(#ff-chest-orange)"/>
  <!-- Free Fire Tactical Diagonal Stripes -->
  <line x1="14" y1="36" x2="20" y2="30" stroke="#f97316" stroke-width="2"/>
  <line x1="20" y1="36" x2="26" y2="30" stroke="#f97316" stroke-width="2"/>
  <!-- Open Overflow Cyan Diamonds -->
  <polygon points="20,18 32,26 20,38 8,26" fill="#06b6d4"/>
  <polygon points="36,12 48,20 36,32 24,20" fill="#a5f3fc"/>
  <polygon points="46,22 56,28 46,38 36,28" fill="#0891b2"/>
  <circle cx="24" cy="14" r="2" fill="#ffffff"/>
  <circle cx="48" cy="12" r="2" fill="#f97316"/>
</svg>`,

  'freefire-weekly-vip.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <defs>
    <linearGradient id="ff-w-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#18181b"/><stop offset="50%" stop-color="#27272a"/><stop offset="100%" stop-color="#09090b"/>
    </linearGradient>
    <linearGradient id="ff-gold-metal" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/><stop offset="50%" stop-color="#eab308"/><stop offset="100%" stop-color="#ca8a04"/>
    </linearGradient>
  </defs>
  <!-- Metallic VIP Card -->
  <rect x="6" y="8" width="52" height="48" rx="8" fill="url(#ff-w-bg)" stroke="url(#ff-gold-metal)" stroke-width="2"/>
  <!-- VIP Crown -->
  <path d="M23 18L26 23L32 17L38 23L41 18L39 27H25Z" fill="url(#ff-gold-metal)"/>
  <!-- Center FF Cyan Diamond -->
  <polygon points="32,26 40,32 32,42 24,32" fill="#22d3ee"/>
  <polygon points="32,26 36,32 32,42" fill="#cffafe"/>
  <!-- "WEEKLY VIP" Ribbon -->
  <rect x="12" y="44" width="40" height="8" rx="4" fill="url(#ff-gold-metal)"/>
  <text x="32" y="50" font-family="system-ui, sans-serif" font-size="5" font-weight="900" fill="#09090b" text-anchor="middle" letter-spacing="0.5">WEEKLY VIP</text>
</svg>`,

  'freefire-monthly-vip.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <defs>
    <linearGradient id="ff-m-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#450a0a"/><stop offset="50%" stop-color="#7f1d1d"/><stop offset="100%" stop-color="#18181b"/>
    </linearGradient>
    <linearGradient id="ff-flame-gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/><stop offset="50%" stop-color="#f97316"/><stop offset="100%" stop-color="#dc2626"/>
    </linearGradient>
  </defs>
  <!-- Card Base -->
  <rect x="6" y="8" width="52" height="48" rx="8" fill="url(#ff-m-bg)" stroke="url(#ff-flame-gold)" stroke-width="2"/>
  <!-- Royal Laurels -->
  <circle cx="32" cy="27" r="12" stroke="url(#ff-flame-gold)" stroke-width="1.5" stroke-dasharray="2 3" opacity="0.6"/>
  <!-- Flaming Center Diamond -->
  <polygon points="32,20 42,28 32,40 22,28" fill="#06b6d4"/>
  <polygon points="32,20 37,28 32,40" fill="#e0f2fe"/>
  <!-- "MONTHLY VIP" Ribbon -->
  <rect x="10" y="44" width="44" height="8" rx="4" fill="url(#ff-flame-gold)"/>
  <text x="32" y="50" font-family="system-ui, sans-serif" font-size="4.8" font-weight="900" fill="#450a0a" text-anchor="middle" letter-spacing="0.5">MONTHLY VIP</text>
</svg>`,

  'freefire-levelup.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <defs>
    <linearGradient id="lu-grad" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#22d3ee"/>
    </linearGradient>
  </defs>
  <rect x="8" y="8" width="48" height="48" rx="8" fill="#0f172a" stroke="#06b6d4" stroke-width="2"/>
  <!-- Chevrons Upward -->
  <path d="M22 36L32 26L42 36" stroke="#22d3ee" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M25 44L32 37L39 44" stroke="#f59e0b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Star on top -->
  <polygon points="32,14 34,19 39,19 35,22 37,27 32,24 27,27 29,22 25,19 30,19" fill="#fde047"/>
</svg>`,

  // ─── 3. PUBG MOBILE (UC) ───────────────────────────────────────────────────
  'pubg-uc-single.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <defs>
    <linearGradient id="uc-gold-face" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/><stop offset="50%" stop-color="#eab308"/><stop offset="100%" stop-color="#a16207"/>
    </linearGradient>
    <radialGradient id="uc-rim" cx="50%" cy="50%" r="50%">
      <stop offset="85%" stop-color="#ca8a04"/><stop offset="100%" stop-color="#713f12"/>
    </radialGradient>
    <filter id="uc-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#eab308" flood-opacity="0.5"/>
    </filter>
  </defs>
  <g filter="url(#uc-glow)">
    <!-- Outer Rim -->
    <circle cx="32" cy="32" r="24" fill="url(#uc-rim)"/>
    <circle cx="32" cy="32" r="21" fill="url(#uc-gold-face)"/>
    <circle cx="32" cy="32" r="18" stroke="#713f12" stroke-width="1" stroke-dasharray="2 2" opacity="0.6"/>
    <!-- Embossed "UC" -->
    <text x="32" y="38" font-family="'Impact', 'Arial Black', sans-serif" font-size="18" font-weight="900" fill="#713f12" text-anchor="middle" letter-spacing="1">UC</text>
    <!-- Highlight Reflection -->
    <path d="M18 22C24 16 38 16 46 22" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
  </g>
</svg>`,

  'pubg-uc-stack.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <defs>
    <linearGradient id="uc-g2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/><stop offset="100%" stop-color="#ca8a04"/>
    </linearGradient>
  </defs>
  <!-- Coin 1 (bottom) -->
  <ellipse cx="26" cy="42" rx="16" ry="7" fill="#713f12"/>
  <ellipse cx="26" cy="40" rx="16" ry="6" fill="url(#uc-g2)"/>
  <!-- Coin 2 (mid) -->
  <ellipse cx="26" cy="36" rx="16" ry="7" fill="#713f12"/>
  <ellipse cx="26" cy="34" rx="16" ry="6" fill="url(#uc-g2)"/>
  <!-- Coin 3 (top) -->
  <ellipse cx="38" cy="30" rx="18" ry="8" fill="#713f12"/>
  <ellipse cx="38" cy="27" rx="18" ry="7" fill="url(#uc-g2)"/>
  <text x="38" y="30" font-family="'Impact', sans-serif" font-size="10" font-weight="bold" fill="#713f12" text-anchor="middle">UC</text>
  <!-- Sparkles -->
  <circle cx="16" cy="20" r="2" fill="#fef08a"/>
  <circle cx="48" cy="14" r="2.5" fill="#fef08a"/>
</svg>`,

  'pubg-uc-crate.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <defs>
    <linearGradient id="pubg-red" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#dc2626"/><stop offset="100%" stop-color="#991b1b"/>
    </linearGradient>
    <linearGradient id="pubg-blue" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#2563eb"/><stop offset="100%" stop-color="#1e3a8a"/>
    </linearGradient>
  </defs>
  <!-- Airdrop Crate (Iconic Red Top & Blue Bottom) -->
  <!-- Blue base -->
  <rect x="10" y="30" width="44" height="26" rx="3" fill="url(#pubg-blue)" stroke="#1e293b" stroke-width="1.5"/>
  <!-- Red Top / Cover -->
  <rect x="8" y="24" width="48" height="10" rx="2" fill="url(#pubg-red)" stroke="#1e293b" stroke-width="1.5"/>
  <!-- Black Straps -->
  <rect x="20" y="24" width="4" height="32" fill="#0f172a"/>
  <rect x="40" y="24" width="4" height="32" fill="#0f172a"/>
  <!-- Glowing UC coins bursting out of top -->
  <ellipse cx="32" cy="22" rx="14" ry="5" fill="#fef08a"/>
  <text x="32" y="24" font-family="'Impact', sans-serif" font-size="6" font-weight="bold" fill="#713f12" text-anchor="middle">UC</text>
  <circle cx="18" cy="14" r="2.5" fill="#fef08a"/>
  <circle cx="46" cy="12" r="3" fill="#fef08a"/>
</svg>`,

  'pubg-elite-pass.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <defs>
    <linearGradient id="rp-gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/><stop offset="50%" stop-color="#eab308"/><stop offset="100%" stop-color="#b45309"/>
    </linearGradient>
    <linearGradient id="rp-dark" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1e293b"/><stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <!-- Military Shield Base -->
  <path d="M12 14L32 8L52 14V34C52 46 32 56 32 56C32 56 12 46 12 34Z" fill="url(#rp-dark)" stroke="url(#rp-gold)" stroke-width="2.5"/>
  <!-- Gold Wing Accents -->
  <path d="M18 20C24 24 28 28 32 30C36 28 40 24 46 20" stroke="url(#rp-gold)" stroke-width="1.5"/>
  <!-- Large Embossed RP -->
  <text x="32" y="38" font-family="'Impact', sans-serif" font-size="16" font-weight="900" fill="url(#rp-gold)" text-anchor="middle" letter-spacing="1">RP</text>
  <!-- ELITE banner -->
  <rect x="18" y="44" width="28" height="6.5" rx="3" fill="#dc2626"/>
  <text x="32" y="49" font-family="system-ui, sans-serif" font-size="4.5" font-weight="900" fill="#ffffff" text-anchor="middle">ELITE</text>
</svg>`,

  // ─── 4. HONOR OF KINGS (HOK) ───────────────────────────────────────────────
  'hok-token-single.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <defs>
    <linearGradient id="hok-gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/><stop offset="50%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#b45309"/>
    </linearGradient>
    <radialGradient id="hok-gem" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#67e8f9"/><stop offset="100%" stop-color="#0e7490"/>
    </radialGradient>
    <filter id="hok-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#f59e0b" flood-opacity="0.5"/>
    </filter>
  </defs>
  <g filter="url(#hok-glow)">
    <!-- Golden Imperial Medallion -->
    <circle cx="32" cy="32" r="24" fill="url(#hok-gold)"/>
    <circle cx="32" cy="32" r="20" fill="#78350f"/>
    <!-- Dragon Wing / Crest Carvings -->
    <path d="M22 24C28 20 36 20 42 24C40 28 36 30 32 30C28 30 24 28 22 24Z" fill="url(#hok-gold)"/>
    <!-- Central Cyan Dragon Gem -->
    <circle cx="32" cy="32" r="8" fill="url(#hok-gem)" stroke="#fef08a" stroke-width="1.5"/>
    <circle cx="30" cy="30" r="1.5" fill="#ffffff"/>
  </g>
</svg>`,

  'hok-token-stack.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <defs>
    <linearGradient id="hok-g2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fde047"/><stop offset="100%" stop-color="#b45309"/>
    </linearGradient>
  </defs>
  <ellipse cx="26" cy="42" rx="16" ry="7" fill="#78350f"/>
  <ellipse cx="26" cy="40" rx="16" ry="6" fill="url(#hok-g2)"/>
  <ellipse cx="26" cy="35" rx="16" ry="7" fill="#78350f"/>
  <ellipse cx="26" cy="33" rx="16" ry="6" fill="url(#hok-g2)"/>
  <!-- Front HoK medallion -->
  <circle cx="38" cy="26" r="16" fill="url(#hok-g2)"/>
  <circle cx="38" cy="26" r="12" fill="#78350f"/>
  <circle cx="38" cy="26" r="5" fill="#06b6d4" stroke="#fef08a" stroke-width="1"/>
  <circle cx="16" cy="18" r="2" fill="#fef08a"/>
</svg>`,

  'hok-weekly-card.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <defs>
    <linearGradient id="hok-w-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#064e3b"/><stop offset="50%" stop-color="#047857"/><stop offset="100%" stop-color="#065f46"/>
    </linearGradient>
    <linearGradient id="hok-card-gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fde047"/><stop offset="100%" stop-color="#b45309"/>
    </linearGradient>
  </defs>
  <!-- Jade & Gold Imperial Card -->
  <rect x="6" y="8" width="52" height="48" rx="8" fill="url(#hok-w-bg)" stroke="url(#hok-card-gold)" stroke-width="2"/>
  <!-- Dragon Icon -->
  <circle cx="32" cy="27" r="10" fill="url(#hok-card-gold)"/>
  <circle cx="32" cy="27" r="7" fill="#064e3b"/>
  <circle cx="32" cy="27" r="3" fill="#34d399"/>
  <!-- WEEKLY Banner -->
  <rect x="12" y="43" width="40" height="8" rx="4" fill="url(#hok-card-gold)"/>
  <text x="32" y="49" font-family="system-ui, sans-serif" font-size="5" font-weight="900" fill="#064e3b" text-anchor="middle" letter-spacing="0.5">WEEKLY CARD</text>
</svg>`,

  // ─── 5. VALORANT (VP) ──────────────────────────────────────────────────────
  'valorant-vp.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <defs>
    <linearGradient id="val-red" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ff4655"/><stop offset="100%" stop-color="#b91c1c"/>
    </linearGradient>
  </defs>
  <!-- Dark card -->
  <rect x="8" y="8" width="48" height="48" rx="8" fill="#0f172a" stroke="#ff4655" stroke-width="1.5"/>
  <!-- Iconic Sharp Valorant V -->
  <polygon points="18,18 28,18 38,40 32,40" fill="url(#val-red)"/>
  <polygon points="46,18 36,18 42,32 46,32" fill="#ffffff"/>
  <!-- VP Text -->
  <text x="32" y="50" font-family="system-ui, sans-serif" font-size="8" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1">VP</text>
</svg>`,

  // ─── 6. GENSHIN IMPACT ─────────────────────────────────────────────────────
  'genshin-crystal.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <defs>
    <linearGradient id="gen-blue" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#a5f3fc"/><stop offset="50%" stop-color="#38bdf8"/><stop offset="100%" stop-color="#6366f1"/>
    </linearGradient>
    <filter id="gen-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#38bdf8" flood-opacity="0.6"/>
    </filter>
  </defs>
  <g filter="url(#gen-glow)">
    <!-- 4-pointed Celestial Crystal Star -->
    <path d="M32 6L37 26L57 32L37 38L32 58L27 38L7 32L27 26Z" fill="url(#gen-blue)"/>
    <path d="M32 14L35 28L49 32L35 36L32 50L29 36L15 32L29 28Z" fill="#ffffff" opacity="0.6"/>
    <circle cx="32" cy="32" r="3" fill="#ffffff"/>
  </g>
</svg>`,

  'genshin-welkin.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <defs>
    <linearGradient id="wel-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e1b4b"/><stop offset="100%" stop-color="#312e81"/>
    </linearGradient>
  </defs>
  <rect x="6" y="8" width="52" height="48" rx="8" fill="url(#wel-bg)" stroke="#fcd34d" stroke-width="2"/>
  <!-- Crescent Moon -->
  <path d="M38 18C28 20 22 28 26 38C20 32 20 24 26 18C30 14 35 15 38 18Z" fill="#fde047"/>
  <!-- Star -->
  <polygon points="40,24 42,27 45,28 42,29 40,32 38,29 35,28 38,27" fill="#ffffff"/>
  <!-- WELKIN text -->
  <rect x="12" y="44" width="40" height="7" rx="3.5" fill="#fcd34d"/>
  <text x="32" y="49.5" font-family="system-ui, sans-serif" font-size="4.5" font-weight="900" fill="#1e1b4b" text-anchor="middle">WELKIN MOON</text>
</svg>`,

  // ─── 7. HONKAI STAR RAIL ───────────────────────────────────────────────────
  'hsr-shard.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <defs>
    <linearGradient id="hsr-prismatic" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#67e8f9"/><stop offset="50%" stop-color="#c084fc"/><stop offset="100%" stop-color="#f43f5e"/>
    </linearGradient>
  </defs>
  <!-- Astral Shard -->
  <polygon points="32,8 50,22 40,54 24,54 14,22" fill="#1e1b4b" stroke="url(#hsr-prismatic)" stroke-width="2"/>
  <polygon points="32,8 40,24 32,54 24,24" fill="url(#hsr-prismatic)"/>
  <polygon points="32,8 50,22 40,24" fill="#a5f3fc"/>
  <polygon points="32,8 14,22 24,24" fill="#fbcfe8"/>
  <circle cx="32" cy="24" r="2.5" fill="#ffffff"/>
</svg>`,

  'hsr-supply-pass.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <rect x="6" y="8" width="52" height="48" rx="8" fill="#18181b" stroke="#38bdf8" stroke-width="2"/>
  <!-- Train Badge / Cosmos -->
  <circle cx="32" cy="26" r="10" fill="#0284c7"/>
  <path d="M26 30L32 20L38 30Z" fill="#ffffff"/>
  <rect x="12" y="44" width="40" height="7" rx="3.5" fill="#38bdf8"/>
  <text x="32" y="49.5" font-family="system-ui, sans-serif" font-size="4.5" font-weight="900" fill="#0f172a" text-anchor="middle">SUPPLY PASS</text>
</svg>`,

  // ─── 8. ROBLOX (ROBUX) ─────────────────────────────────────────────────────
  'roblox-robux.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <defs>
    <linearGradient id="rbx-silver" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f1f5f9"/><stop offset="50%" stop-color="#cbd5e1"/><stop offset="100%" stop-color="#64748b"/>
    </linearGradient>
  </defs>
  <!-- Modern Hexagonal Coin -->
  <polygon points="32,8 52,19 52,45 32,56 12,45 12,19" fill="url(#rbx-silver)" stroke="#475569" stroke-width="2"/>
  <!-- Tilted Square Cutout -->
  <g transform="translate(32, 32) rotate(45)">
    <rect x="-8" y="-8" width="16" height="16" rx="2" fill="#0f172a"/>
  </g>
</svg>`,

  // ─── 9. CODM (CP POINTS) ───────────────────────────────────────────────────
  'codm-cp.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <circle cx="32" cy="32" r="23" fill="#1e293b" stroke="#eab308" stroke-width="2.5"/>
  <circle cx="32" cy="32" r="19" fill="#0f172a"/>
  <text x="32" y="38" font-family="'Impact', sans-serif" font-size="16" font-weight="900" fill="#eab308" text-anchor="middle" letter-spacing="1">CP</text>
</svg>`,

  // ─── 10. BLOOD STRIKE (GOLD) ───────────────────────────────────────────────
  'bloodstrike-gold.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <circle cx="32" cy="32" r="23" fill="#450a0a" stroke="#f59e0b" stroke-width="2.5"/>
  <polygon points="32,16 44,24 44,40 32,48 20,40 20,24" fill="#f59e0b"/>
  <circle cx="32" cy="32" r="6" fill="#450a0a"/>
</svg>`,

  // ─── 11. UNIVERSAL / GENERIC ASSETS ────────────────────────────────────────
  'generic-gem.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <polygon points="20,16 44,16 54,28 10,28" fill="#a855f7"/>
  <polygon points="10,28 24,28 32,52" fill="#7e22ce"/>
  <polygon points="24,28 40,28 32,52" fill="#c084fc"/>
  <polygon points="40,28 54,28 32,52" fill="#581c87"/>
  <circle cx="28" cy="22" r="2" fill="#ffffff"/>
</svg>`,

  'generic-coin.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <circle cx="32" cy="32" r="22" fill="#eab308" stroke="#ca8a04" stroke-width="2"/>
  <circle cx="32" cy="32" r="17" fill="#fef08a"/>
  <text x="32" y="38" font-family="system-ui, sans-serif" font-size="16" font-weight="900" fill="#a16207" text-anchor="middle">$</text>
</svg>`,

  'generic-pass.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <rect x="8" y="12" width="48" height="40" rx="6" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
  <circle cx="32" cy="28" r="8" fill="#38bdf8"/>
  <polygon points="32,22 34,26 38,27 35,30 36,34 32,32 28,34 29,30 26,27 30,26" fill="#ffffff"/>
  <rect x="16" y="41" width="32" height="6" rx="3" fill="#38bdf8"/>
  <text x="32" y="46" font-family="system-ui, sans-serif" font-size="4" font-weight="900" fill="#0f172a" text-anchor="middle">BATTLE PASS</text>
</svg>`,
}

for (const [filename, svgContent] of Object.entries(icons)) {
  const filePath = path.join(TARGET_DIR, filename)
  fs.writeFileSync(filePath, svgContent.trim(), 'utf-8')
  console.log('✅ Created:', filename)
}

console.log('\\n🎉 All package visual icons generated successfully!')
