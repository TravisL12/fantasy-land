import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { DASHBOARD_LIMITS } from '../dashboards.constants.js';

/**
 * The spec only gets shape-checked here — parseSpec does the real validation,
 * because its messages have to be specific enough for the model to act on.
 */
export class DashboardSpecDto {
  @IsObject()
  spec!: Record<string, unknown>;

  /** What the user asked for. Kept verbatim so the dashboard can show it. */
  @IsOptional()
  @IsString()
  @MaxLength(DASHBOARD_LIMITS.prompt)
  prompt?: string;
}
