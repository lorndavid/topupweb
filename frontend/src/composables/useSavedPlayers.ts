import { ref, computed } from 'vue'

export interface SavedPlayer {
  gameCode: string
  playerId: string
  serverId?: string
  nickname: string
  region?: string
  gameTitle?: string
  /** Timestamp is auto-set by the system when saving via save() */
  timestamp: number
}

/** Data needed to save a player. Timestamp is added automatically. */
export type SavedPlayerInput = Omit<SavedPlayer, 'timestamp'>

const STORAGE_KEY = 'gametopup_saved_players'

/**
 * Load saved players from localStorage.
 */
function loadAll(): SavedPlayer[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as SavedPlayer[]
  } catch {
    return []
  }
}

/**
 * Save all players to localStorage.
 */
function persistAll(players: SavedPlayer[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(players))
  } catch {
    // localStorage might be full — silently fail
  }
}

/**
 * Composable for managing saved player IDs in localStorage.
 *
 * When a player ID is successfully verified, save it so returning
 * customers can re-select it instantly on their next visit.
 */
export function useSavedPlayers() {
  const savedPlayers = ref<SavedPlayer[]>(loadAll())

  /**
   * Get all saved players for a specific game code, sorted by most recent first.
   */
  function getByGame(gameCode: string): SavedPlayer[] {
    return savedPlayers.value
      .filter((p) => p.gameCode === gameCode)
      .sort((a, b) => b.timestamp - a.timestamp)
  }

  /**
   * Save or update a verified player.
   * If the same (gameCode + playerId) already exists, update its data + bump timestamp.
   * Otherwise, append as a new entry.
   */
  function save(player: SavedPlayerInput): void {
    const idx = savedPlayers.value.findIndex(
      (p) => p.gameCode === player.gameCode && p.playerId === player.playerId
    )

    if (idx >= 0) {
      // Update existing entry + bump timestamp
      savedPlayers.value[idx] = {
        ...savedPlayers.value[idx],
        ...player,
        timestamp: Date.now(),
      }
    } else {
      savedPlayers.value.push({ ...player, timestamp: Date.now() })
    }

    persistAll(savedPlayers.value)
  }

  /**
   * Remove a saved player by gameCode + playerId.
   */
  function remove(gameCode: string, playerId: string): void {
    savedPlayers.value = savedPlayers.value.filter(
      (p) => !(p.gameCode === gameCode && p.playerId === playerId)
    )
    persistAll(savedPlayers.value)
  }

  /**
   * Clear all saved players.
   */
  function clearAll(): void {
    savedPlayers.value = []
    localStorage.removeItem(STORAGE_KEY)
  }

  return {
    savedPlayers: computed(() => savedPlayers.value),
    getByGame,
    save,
    remove,
    clearAll,
  }
}
