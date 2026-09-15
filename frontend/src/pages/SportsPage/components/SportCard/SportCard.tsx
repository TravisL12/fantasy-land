import { buildSportStatsPath } from '@/router/routes.constants';
import { SPORT_CARD_COPY } from './SportCard.constants';
import {
  Card,
  Cta,
  GroupTag,
  Groups,
  League,
  Meta,
  Name,
} from './SportCard.styles';
import type { SportCardProps } from './SportCard.types';

export const SportCard = ({ sport }: SportCardProps) => (
  <Card to={buildSportStatsPath(sport.key)}>
    <League>{sport.league}</League>
    <Name>{sport.name}</Name>
    <Meta>
      {SPORT_CARD_COPY.season(sport.defaultSeason, sport.currentWeek)}
    </Meta>
    <Groups>
      {sport.groups.map((group) => (
        <GroupTag key={group.key}>{group.label}</GroupTag>
      ))}
    </Groups>
    <Meta>{SPORT_CARD_COPY.source(sport.dataSource.name)}</Meta>
    <Cta>{SPORT_CARD_COPY.cta}</Cta>
  </Card>
);
