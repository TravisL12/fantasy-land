import { ArgumentMetadata, ValidationPipe } from '@nestjs/common';
import { VALIDATION_PIPE_OPTIONS } from '../../../app.setup.js';
import { GamePreviewQueryDto, ScheduleQueryDto } from './sport-views-query.dto.js';

/**
 * These run the app's own pipe options rather than a second copy of them,
 * because the failure being guarded against is a whitelisting one: a query
 * field a DTO does not declare is stripped in silence, so the route quietly
 * ignores an argument the service and the tool both honour. A decorator-only
 * test would not have caught it.
 */
const pipe = new ValidationPipe(VALIDATION_PIPE_OPTIONS);

const parse = <T>(metatype: new () => T, query: Record<string, unknown>) =>
  pipe.transform(query, {
    type: 'query',
    metatype,
  } as ArgumentMetadata) as Promise<T>;

describe('GamePreviewQueryDto', () => {
  it('keeps the interval the service and the tool both accept', async () => {
    const parsed = await parse(GamePreviewQueryDto, {
      teamA: 'NYY',
      teamB: 'BOS',
      startDate: '2026-07-01',
      endDate: '2026-08-31',
    });

    expect(parsed).toMatchObject({
      startDate: '2026-07-01',
      endDate: '2026-08-31',
    });
  });

  it('rejects a date that is not YYYY-MM-DD rather than dropping it', async () => {
    await expect(
      parse(GamePreviewQueryDto, {
        teamA: 'NYY',
        teamB: 'BOS',
        startDate: 'july',
      }),
    ).rejects.toThrow();
  });

  it('requires both teams', async () => {
    await expect(parse(GamePreviewQueryDto, { teamA: 'NYY' })).rejects.toThrow();
  });
});

describe('ScheduleQueryDto', () => {
  /** A single repeated query param arrives as one string, not an array. */
  it('takes weeks as numbers however the query spelled them', async () => {
    const parsed = await parse(ScheduleQueryDto, { weeks: '3' });

    expect(parsed.weeks).toEqual([3]);
  });

  /** Everything in a query string is a string, including a list of weeks. */
  it('coerces a repeated weeks param rather than rejecting the request', async () => {
    const parsed = await parse(ScheduleQueryDto, { weeks: ['3', '4'] });

    expect(parsed.weeks).toEqual([3, 4]);
  });

  it('still rejects a week outside the season', async () => {
    await expect(parse(ScheduleQueryDto, { weeks: '99' })).rejects.toThrow();
  });

  it('keeps a date window', async () => {
    const parsed = await parse(ScheduleQueryDto, {
      startDate: '2026-09-20',
      endDate: '2026-09-21',
    });

    expect(parsed).toMatchObject({
      startDate: '2026-09-20',
      endDate: '2026-09-21',
    });
  });
});
