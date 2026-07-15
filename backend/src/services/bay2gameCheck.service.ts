import axios from 'axios';

const CHECK_ID_API_URL = 'https://checkid.bay2game.xyz/check_id';

export interface CheckIdParams {
  game: string;
  userid: string;
  serverid?: string;
}

export interface CheckIdResult {
  status: 'APPROVED' | 'NOT_ALLOW' | string;
  message: string;
  username?: string;
  region?: string;
  game_title?: string;
  timestamp?: string;
  developer?: string;
}

export class Bay2GameCheckService {
  /**
   * Check a player's game ID using the Bay2Game Check ID API.
   * No API key required for this endpoint.
   */
  async checkId(params: CheckIdParams): Promise<CheckIdResult> {
    try {
      const queryParams: Record<string, string> = {
        game: params.game,
        userid: params.userid,
      };

      if (params.serverid) {
        queryParams.serverid = params.serverid;
      }

      const { data } = await axios.get<CheckIdResult>(CHECK_ID_API_URL, {
        params: queryParams,
        timeout: 30000, // 30s timeout as per API docs
        headers: {
          'Accept': 'application/json',
        },
      });

      return data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          // The API returned an error response
          return {
            status: 'NOT_ALLOW',
            message: error.response.data?.message || 'API request failed',
          };
        }
        if (error.code === 'ECONNABORTED') {
          return {
            status: 'NOT_ALLOW',
            message: 'Request timed out. Please try again.',
          };
        }
      }

      return {
        status: 'NOT_ALLOW',
        message: 'Failed to connect to verification service.',
      };
    }
  }

  /**
   * A simplified verify that returns the player info in a consistent format.
   * Used to replace the old gameLookupService.
   */
  async verifyPlayer(params: {
    gameCode: string;
    playerId: string;
    serverId?: string;
  }): Promise<{
    verified: boolean;
    nickname?: string;
    playerId: string;
    serverId?: string;
    region?: string;
    gameTitle?: string;
    provider?: string;
  }> {
    const result = await this.checkId({
      game: params.gameCode,
      userid: params.playerId,
      serverid: params.serverId,
    });

    if (result.status === 'APPROVED' && result.username) {
      return {
        verified: true,
        nickname: result.username,
        playerId: params.playerId,
        serverId: params.serverId || result.region,
        region: result.region,
        gameTitle: result.game_title,
        provider: 'bay2game',
      };
    }

    return {
      verified: false,
      playerId: params.playerId,
    };
  }
}

export const bay2gameCheckService = new Bay2GameCheckService();
