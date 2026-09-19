// Raw Sleeper API shapes (only the fields we read).

export interface SleeperState {
  week: number;
  display_week: number;
  season: string;
  previous_season: string;
  season_type: string;
  season_has_scores: boolean;
}

export interface SleeperPlayerInfo {
  player_id?: string;
  first_name: string | null;
  last_name: string | null;
  position: string | null;
  team: string | null;
}

/** One entry in the bulk `/players/nfl` payload. */
export interface SleeperDirectoryEntry extends SleeperPlayerInfo {
  full_name?: string | null;
  fantasy_positions?: string[] | null;
  /** Roster status in upstream's wording, e.g. "Active", "Injured Reserve". */
  status?: string | null;
  /** Game-status designation, e.g. "Questionable", "Out", "IR". */
  injury_status?: string | null;
  /** Upstream's relevance ranking; lower is more relevant. */
  search_rank?: number | null;
}

/** The whole league, keyed by player id. */
export type SleeperDirectory = Record<string, SleeperDirectoryEntry | null>;

export interface SleeperStatEntry {
  player_id: string;
  team: string | null;
  opponent?: string | null;
  week: number | null;
  date: string | null;
  is_away_team?: boolean;
  stats: Record<string, number>;
  player?: SleeperPlayerInfo;
}

/** Player game log keyed by week; bye weeks are null. */
export type SleeperWeeklyLog = Record<string, SleeperStatEntry | null>;

/** One fixture from Sleeper's season schedule. */
export interface SleeperScheduleGame {
  game_id: string;
  date: string;
  week: number;
  home: string;
  away: string;
  /** e.g. "pre_game", "in_game", "complete", "canceled". */
  status: string;
}

/**
 * ESPN's scoreboard, read only for final scores — Sleeper's schedule carries
 * the fixtures but no result. Only the handful of fields we use are typed.
 */
export interface EspnCompetitor {
  homeAway: string;
  score?: string | null;
  team: { abbreviation?: string | null };
}

export interface EspnScoreboard {
  events?: {
    competitions?: {
      status?: { type?: { completed?: boolean } };
      competitors?: EspnCompetitor[];
    }[];
  }[];
}
