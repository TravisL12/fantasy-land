export interface StatColumnsState {
  /** Chosen stat keys per `<sport>:<group>` scope; missing scopes use the group defaults. */
  selected: Record<string, string[]>;
}

export interface StatColumnPayload {
  scope: string;
  stat: string;
  defaults: string[];
  /** Full ordered stat list, so selections keep the catalog's column order. */
  order: string[];
}
