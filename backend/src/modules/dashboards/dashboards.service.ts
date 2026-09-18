import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.constants.js';
import type { Database } from '../../database/database.types.js';
import { ToolRegistry } from '../tools/tools.registry.js';
import {
  DASHBOARD_LIMITS,
  DASHBOARD_MESSAGES,
} from './dashboards.constants.js';
import { dashboards } from './dashboards.schema.js';
import type {
  Dashboard,
  DashboardInput,
  DashboardRun,
  DashboardSpec,
  PublicDashboard,
  SourceResult,
} from './dashboards.types.js';
import { parseSpec } from './dashboards.utils.js';

@Injectable()
export class DashboardsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly tools: ToolRegistry,
  ) {}

  /** The tool names a spec is allowed to name as a source. */
  knownTools(): string[] {
    return this.tools.listLocalTools().map(({ name }) => name);
  }

  validate(spec: unknown): DashboardSpec {
    return parseSpec(spec, this.knownTools());
  }

  /**
   * Runs every source in parallel. One failing source leaves the rest of the
   * dashboard usable, so failures are reported per source rather than thrown.
   */
  async run(spec: DashboardSpec): Promise<DashboardRun> {
    const entries = await Promise.all(
      spec.sources.map(
        async ({ id, tool, args }): Promise<[string, SourceResult]> => [
          id,
          await this.tools.callLocalToolData(tool, args),
        ],
      ),
    );

    return { ranAt: new Date().toISOString(), results: Object.fromEntries(entries) };
  }

  list(userId: string): Promise<Dashboard[]> {
    return this.db
      .select()
      .from(dashboards)
      .where(eq(dashboards.userId, userId))
      .orderBy(desc(dashboards.updatedAt));
  }

  async get(userId: string, id: string): Promise<Dashboard> {
    const [dashboard] = await this.db
      .select()
      .from(dashboards)
      .where(and(eq(dashboards.id, id), eq(dashboards.userId, userId)));
    if (!dashboard) throw new NotFoundException(DASHBOARD_MESSAGES.notFound);
    return dashboard;
  }

  async create(userId: string, input: DashboardInput): Promise<Dashboard> {
    const saved = await this.list(userId);
    if (saved.length >= DASHBOARD_LIMITS.perUser) {
      throw new ForbiddenException(DASHBOARD_MESSAGES.tooMany);
    }

    const [dashboard] = await this.db
      .insert(dashboards)
      .values({ userId, ...this.columns(input) })
      .returning();
    return dashboard;
  }

  async update(
    userId: string,
    id: string,
    input: DashboardInput,
  ): Promise<Dashboard> {
    await this.get(userId, id);
    const [dashboard] = await this.db
      .update(dashboards)
      .set(this.columns(input))
      .where(and(eq(dashboards.id, id), eq(dashboards.userId, userId)))
      .returning();
    return dashboard;
  }

  /** The columns a save writes: the spec, its own headings, and the request. */
  private columns({ spec, prompt }: DashboardInput) {
    return {
      title: spec.title,
      description: spec.description ?? null,
      prompt: prompt?.trim() || null,
      spec,
    };
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.get(userId, id);
    await this.db
      .delete(dashboards)
      .where(and(eq(dashboards.id, id), eq(dashboards.userId, userId)));
  }

  toPublic({
    id,
    title,
    description,
    prompt,
    spec,
    createdAt,
    updatedAt,
  }: Dashboard): PublicDashboard {
    return { id, title, description, prompt, spec, createdAt, updatedAt };
  }
}
