/**
 * Game-specific currency labels for top-up packages.
 * Maps game codes to their in-game currency names.
 */
export const GAME_CURRENCY_MAP: Record<string, string> = {
  mlbb: 'Diamonds',
  mlbb_global: 'Diamonds',
  mlbb_exclusive: 'Diamonds',
  freefire_global: 'Diamonds',
  freefire_sgmy: 'Diamonds',
  freefire_vn: 'Diamonds',
  freefire_th: 'Diamonds',
  freefire_id: 'Diamonds',
  freefire_br: 'Diamonds',
  freefire_pk: 'Diamonds',
  pubgm: 'UC',
  pubg_global: 'UC',
  pubg_krjp: 'UC',
  pubg_vn: 'UC',
  pubg_th: 'UC',
  hok: 'Tokens',
  hok_global: 'Tokens',
  genshin: 'Genesis Crystals',
  genshin_global: 'Genesis Crystals',
  hsr: 'Oneiric Shards',
  hsr_global: 'Oneiric Shards',
  valorant: 'Valorant Points',
  roblox: 'Robux',
  codm: 'CP',
  bloodstrike: 'Gold',
}

/**
 * Get the in-game currency label for a given game code.
 * Supports exact match as well as prefix matching (e.g. mlbb_*, freefire_*).
 */
export function getGameCurrency(gameCode: string = ''): string {
  const code = gameCode.toLowerCase()
  if (GAME_CURRENCY_MAP[code]) return GAME_CURRENCY_MAP[code]

  if (code.startsWith('mlbb')) return 'Diamonds'
  if (code.startsWith('freefire')) return 'Diamonds'
  if (code.startsWith('pubg')) return 'UC'
  if (code.startsWith('hok')) return 'Tokens'
  if (code.startsWith('genshin')) return 'Genesis Crystals'
  if (code.startsWith('hsr')) return 'Oneiric Shards'
  if (code.startsWith('val')) return 'Points'
  if (code.startsWith('roblox')) return 'Robux'
  if (code.startsWith('cod')) return 'CP'
  if (code.startsWith('bloodstrike')) return 'Gold'

  return 'Currency'
}

/**
 * Try to extract the numeric amount from a product name.
 * E.g., "55 Diamonds" → "55", "86 Diamonds + 1 Bonus" → "86", "86" → "86", "210 UC" → "210"
 */
export function extractAmount(productName: string): string {
  if (!productName) return '0'
  // Match number at the beginning (e.g. "86", "86 Diamonds", "55 + 5 Bonus")
  const match = productName.match(/^(\d[\d,]*)/)
  if (match) return match[1]
  return productName
}
