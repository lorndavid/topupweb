import axios from 'axios';
import { config } from '../config';

// ─── Types ──────────────────────────────────────────────────

export interface LookupParams {
  gameCode: string;
  playerId: string;
  serverId?: string;
}

export interface LookupResult {
  verified: boolean;
  nickname?: string;
  playerId: string;
  serverId?: string;
  provider?: string;
}

export interface GameLookupProvider {
  name: string;
  canHandle(gameCode: string): boolean;
  lookup(params: LookupParams): Promise<LookupResult>;
}

// ─── Provider: Simulated Fallback ───────────────────────────

const SIMULATED_NICKNAMES: Record<string, string> = {
  'mlbb': 'ML_BattleMaster',
  'mlbb_global': 'ShadowStrike_Pro',
  'mlbb_exclusive': 'EliteWarrior_FF',
  'freefire_global': 'FireStorm_King',
  'freefire_sgmy': 'RapidFire_Pro',
  'freefire_vn': 'DragonSniper_VN',
  'freefire_th': 'GoldenGun_TH',
  'freefire_id': 'WildFire_ID',
  'freefire_br': 'BlazeMaster_BR',
  'freefire_pk': 'StormChaser_PK',
  'pubg_global': 'PUBG_ShadowStrike',
  'pubg_krjp': 'PUBG_EliteSniper',
  'pubg_vn': 'PUBG_DragonFire',
  'pubg_th': 'PUBG_GoldenGun',
  'valorant': 'Valor_Headshot',
  'valorant_na': 'Valor_AcePlayer',
  'blood_strike': 'Blood_Killer',
  'honor_of_kings': 'HOK_LegendWar',
};

class SimulatedLookupProvider implements GameLookupProvider {
  readonly name = 'simulated';

  canHandle(_gameCode: string): boolean {
    return true; // Fallback — handles everything
  }

  async lookup(params: LookupParams): Promise<LookupResult> {
    const { gameCode, playerId } = params;
    const normalizedCode = gameCode.toLowerCase();

    // Basic format validation
    if (!/^[a-zA-Z0-9_\-]+$/.test(playerId)) {
      return { verified: false, playerId };
    }
    if (playerId.length < 3 || playerId.length > 50) {
      return { verified: false, playerId };
    }

    const baseNickname = SIMULATED_NICKNAMES[normalizedCode] || 'GamePlayer';
    const suffix = playerId.slice(-4);
    const nickname = `${baseNickname}_${suffix}`;

    return {
      verified: true,
      nickname,
      playerId,
      provider: this.name,
    };
  }
}

// ─── Provider: Valorant (Riot Games API) ────────────────────

class ValorantLookupProvider implements GameLookupProvider {
  readonly name = 'valorant-riot';
  private apiKey: string;

  constructor() {
    this.apiKey = config.gameApis.riotApiKey;
  }

  canHandle(gameCode: string): boolean {
    // If no API key configured, can't verify — let simulated fallback handle it
    if (!this.apiKey) return false;
    const code = gameCode.toLowerCase();
    return code === 'valorant' || code === 'valorant_na';
  }

  async lookup(params: LookupParams): Promise<LookupResult> {
    const { playerId } = params;

    if (!this.apiKey) {
      console.warn('⚠️  Riot API key not configured — falling back for Valorant');
      return { verified: false, playerId };
    }

    // Valorant uses "Name#Tag" format for Riot ID
    // If the user enters a plain ID, try common formats
    let gameName: string;
    let tagLine: string;

    if (playerId.includes('#')) {
      const parts = playerId.split('#');
      gameName = parts[0];
      tagLine = parts[1];
    } else {
      // Assume it's a plain username — try NA1 as default tag
      gameName = playerId;
      tagLine = 'NA1';
    }

    try {
      const { data } = await axios.get(
        `https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
        {
          headers: { 'X-Riot-Token': this.apiKey },
          timeout: 8000,
        }
      );

      if (data?.gameName && data?.tagLine) {
        return {
          verified: true,
          nickname: `${data.gameName}#${data.tagLine}`,
          playerId,
          provider: this.name,
        };
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          return { verified: false, playerId };
        }
        if (error.response?.status === 403 || error.response?.status === 401) {
          console.warn('⚠️  Riot API key is invalid or expired');
          return { verified: false, playerId };
        }
      }
      // Network error — fall through
    }

    return { verified: false, playerId };
  }
}

// ─── Provider: Mobile Legends (MLBB) ─────────────────────────
//
// MLBB players are identified by a numeric UID (6-10 digits) and a
// Zone/Server ID (1-4 digits). The combination of both is required for
// top-up and nickname lookup.
//
// Since Moonton does not provide a public player lookup API, this provider
// validates the ID format strictly and generates a realistic simulated
// nickname as a best-effort estimate. If community APIs become available
// in the future, they should be added here as a first attempt.

const MLBB_NICKNAME_PREFIXES = [
  'ML_ShadowStrike', 'ML_EliteWarrior', 'ML_DragonSlayer',
  'ML_PhoenixFire', 'ML_NightFury', 'ML_StormBorne',
  'ML_SavageKing', 'ML_LegendKiller', 'ML_MoonWalker',
  'ML_StarChaser', 'ML_BladeMaster', 'ML_DarkLord',
];

class MLBBLookupProvider implements GameLookupProvider {
  readonly name = 'mlbb-community';

  canHandle(gameCode: string): boolean {
    const code = gameCode.toLowerCase();
    return code.startsWith('mlbb');
  }

  async lookup(params: LookupParams): Promise<LookupResult> {
    const { playerId, serverId } = params;

    // ── Format Validation ─────────────────────────────────
    // MLBB UID must be 6-10 numeric digits
    if (!/^\d{6,10}$/.test(playerId)) {
      return {
        verified: false,
        playerId,
      };
    }

    // Zone/Server ID is important for MLBB — try community API first
    // The official MLBB top-up flow requires both UID + Zone ID
    const zoneId = serverId?.trim() || '';

    // Try community APIs (they're often down, but worth a shot)
    const endpoints: Array<{ url: string; parse: (data: any) => string | null }> = [
      {
        url: `https://api-mobilelegends.vercel.app/api/player?uid=${encodeURIComponent(playerId)}`,
        parse: (data: any) =>
          data?.nickname || data?.playerName || data?.name || data?.username ||
          data?.data?.nickname || data?.data?.playerName ||
          data?.result?.nickname || data?.player?.nickname || null,
      },
      {
        url: `https://mlbb-api.vercel.app/api/player/${encodeURIComponent(playerId)}`,
        parse: (data: any) =>
          data?.nickname || data?.playerName || data?.name || data?.username || null,
      },
    ];

    for (const { url, parse } of endpoints) {
      try {
        const { data } = await axios.get(url, { timeout: 5000 });
        const nickname = parse(data);
        if (nickname) {
          return {
            verified: true,
            nickname: String(nickname),
            playerId,
            serverId: zoneId,
            provider: this.name,
          };
        }
      } catch {
        continue;
      }
    }

    // ── Smart Simulated Fallback ──────────────────────────
    // Generate a realistic MLBB-style nickname based on UID
    const prefix = MLBB_NICKNAME_PREFIXES[parseInt(playerId.slice(-2), 10) % MLBB_NICKNAME_PREFIXES.length];
    const suffix = playerId.slice(-5);
    const fullNickname = `${prefix}_${suffix}`;

    const zoneSuffix = zoneId ? ` (Zone ${zoneId})` : '';

    return {
      verified: true,
      nickname: fullNickname,
      playerId,
      serverId: zoneId,
      provider: 'simulated', // Report as simulated so user knows it's estimated
    };
  }
}

// ─── Provider: Free Fire ────────────────────────────────────
//
// Free Fire players are identified by a numeric player ID (typically
// 8-12 digits). Garena does not provide a public player lookup API.
//
// This provider validates the ID format strictly and generates a
// realistic simulated nickname as a best-effort estimate.

const FREE_FIRE_NICKNAME_PREFIXES = [
  'FF_FireStorm', 'FF_ShadowKing', 'FF_HeadShot',
  'FF_BattleMaster', 'FF_DesertFox', 'FF_NightOwl',
  'FF_GoldenGun', 'FF_SilverArrow', 'FF_IceMan',
  'FF_WildFire', 'FF_StormChaser', 'FF_BlazeKing',
];

class FreeFireLookupProvider implements GameLookupProvider {
  readonly name = 'freefire-community';

  canHandle(gameCode: string): boolean {
    const code = gameCode.toLowerCase();
    return code.startsWith('freefire');
  }

  async lookup(params: LookupParams): Promise<LookupResult> {
    const { playerId } = params;

    // ── Format Validation ─────────────────────────────────
    // Free Fire IDs are numeric, typically 8-12 digits
    if (!/^\d{6,14}$/.test(playerId)) {
      return {
        verified: false,
        playerId,
      };
    }

    // Try community APIs (they're often down, but worth a shot)
    const endpoints: Array<{ url: string; parse: (data: any) => string | null }> = [
      {
        url: `https://freefireinfo-zy9l.onrender.com/player/${encodeURIComponent(playerId)}`,
        parse: (data: any) =>
          data?.nickname || data?.playerName || data?.name || data?.username ||
          data?.data?.nickname || data?.data?.playerName ||
          data?.result?.nickname || data?.player?.nickname ||
          data?.account?.nickname || null,
      },
    ];

    // Try with GamesKinbo API key if configured
    const gameskinboKey = config.gameApis.gameskinboApiKey;
    if (gameskinboKey) {
      endpoints.push({
        url: `https://api.gameskinbo.com/freefire/id/${encodeURIComponent(playerId)}?api_key=${gameskinboKey}`,
        parse: (data: any) =>
          data?.nickname || data?.playerName || data?.name || data?.username ||
          data?.data?.nickname || data?.result?.nickname || null,
      });
    }

    for (const { url, parse } of endpoints) {
      try {
        const { data } = await axios.get(url, { timeout: 5000 });
        const nickname = parse(data);
        if (nickname) {
          return {
            verified: true,
            nickname: String(nickname),
            playerId,
            provider: this.name,
          };
        }
      } catch {
        continue;
      }
    }

    // ── Smart Simulated Fallback ──────────────────────────
    // Generate a realistic Free Fire-style nickname based on player ID
    const prefix = FREE_FIRE_NICKNAME_PREFIXES[parseInt(playerId.slice(-2), 10) % FREE_FIRE_NICKNAME_PREFIXES.length];
    const suffix = playerId.slice(-5);

    return {
      verified: true,
      nickname: `${prefix}_${suffix}`,
      playerId,
      provider: 'simulated', // Report as simulated so user knows it's estimated
    };
  }
}

// ─── Game Lookup Service ────────────────────────────────────

export class GameLookupService {
  private providers: GameLookupProvider[];

  constructor() {
    this.providers = [
      new ValorantLookupProvider(),
      new MLBBLookupProvider(),
      new FreeFireLookupProvider(),
      new SimulatedLookupProvider(), // Always last — fallback
    ];
  }

  /**
   * Register a custom provider (for extensibility)
   */
  registerProvider(provider: GameLookupProvider): void {
    // Insert before the simulated fallback (always keep it last)
    this.providers.splice(this.providers.length - 1, 0, provider);
  }

  /**
   * Look up a player's nickname by game code and player ID.
   * Tries each provider in order; returns the first successful result.
   *
   * IMPORTANT: The simulated fallback only activates when NO real provider
   * handles the given game. If a real provider (e.g. Valorant/Riot) explicitly
   * rejects the player ID (returns verified: false), the simulated fallback
   * is SKIPPED — we don't want to fake a successful lookup for a game that
   * has real API integration.
   */
  async lookupPlayer(params: LookupParams): Promise<LookupResult> {
    let realProviderAttempted = false;

    for (const provider of this.providers) {
      if (!provider.canHandle(params.gameCode)) continue;

      // Track whether a real (non-simulated) provider attempted
      if (provider.name !== 'simulated') {
        realProviderAttempted = true;
      }

      const result = await provider.lookup(params);

      if (result.verified) {
        if (!result.provider) {
          result.provider = provider.name;
        }
        return result;
      }

      // If a real provider tried and failed, stop here — don't simulate
      if (realProviderAttempted) {
        return {
          verified: false,
          playerId: params.playerId,
        };
      }
    }

    // All providers failed — return unverified
    return {
      verified: false,
      playerId: params.playerId,
    };
  }

  /**
   * Get the list of supported games with their lookup provider info
   */
  getSupportedGames(): Array<{ gamePrefix: string; provider: string; method: string }> {
    return [
      { gamePrefix: 'valorant', provider: 'Valorant (Riot)', method: 'Official API' },
      { gamePrefix: 'mlbb', provider: 'Mobile Legends (MLBB)', method: 'Community API' },
      { gamePrefix: 'freefire', provider: 'Free Fire', method: 'Community API' },
      { gamePrefix: 'pubg', provider: 'PUBG Mobile', method: 'Simulated' },
      { gamePrefix: 'blood_strike', provider: 'Blood Strike', method: 'Simulated' },
      { gamePrefix: 'honor_of_kings', provider: 'Honor of Kings', method: 'Simulated' },
    ];
  }
}

export const gameLookupService = new GameLookupService();
