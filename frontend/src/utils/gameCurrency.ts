/**
 * Game-specific currency labels for top-up packages.
 * Maps game codes to their in-game currency names.
 */
export const GAME_CURRENCY_MAP: Record<string, string> = {
  mlbb: 'Diamond',
  mlbb_global: 'Diamond',
  mlbb_exclusive: 'Diamond',
  freefire_global: 'Diamond',
  freefire_sgmy: 'Diamond',
  freefire_vn: 'Diamond',
  freefire_th: 'Diamond',
  freefire_id: 'Diamond',
  freefire_br: 'Diamond',
  freefire_pk: 'Diamond',
  pubgm: 'UC',
  pubg_global: 'UC',
  pubg_krjp: 'UC',
  pubg_vn: 'UC',
  pubg_th: 'UC',
  hok: 'Token',
}

/**
 * Get the in-game currency label for a given game code.
 * Falls back to extracting from the product name if no mapping exists.
 */
export function getGameCurrency(gameCode: string): string {
  const currency = GAME_CURRENCY_MAP[gameCode]
  if (currency) return currency

  // Fallback: capitalise "Unknown Currency"
  return 'Currency'
}

/**
 * Try to extract the numeric amount from a product name.
 * E.g., "55 Diamonds" → "55", "86 Diamonds + 1 Bonus" → "86", "210 UC" → "210"
 */
export function extractAmount(productName: string): string {
  const match = productName.match(/^(\d[\d,]*)\s/)
  if (match) return match[1]
  return productName
}
