import { IsObject } from 'class-validator';

/**
 * The spec only gets shape-checked here — parseSpec does the real validation,
 * because its messages have to be specific enough for the model to act on.
 */
export class DashboardSpecDto {
  @IsObject()
  spec!: Record<string, unknown>;
}
