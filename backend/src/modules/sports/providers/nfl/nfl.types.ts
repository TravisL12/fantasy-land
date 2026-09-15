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
