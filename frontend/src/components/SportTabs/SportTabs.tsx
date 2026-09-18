import { buildSportViewPath } from '@/router/routes.constants';
import { SPORT_TABS } from './SportTabs.constants';
import { Tab, Tabs } from './SportTabs.styles';
import type { SportTabsProps } from './SportTabs.types';

/** The datasets this sport actually has, as links under /sports/:sport. */
export const SportTabs = ({ catalog }: SportTabsProps) => (
  <Tabs>
    {SPORT_TABS.filter(
      ({ requires }) => !requires || catalog.capabilities[requires],
    ).map(({ segment, label }) => (
      <Tab
        key={label}
        to={buildSportViewPath(catalog.key, segment)}
        end={!segment}
      >
        {label}
      </Tab>
    ))}
  </Tabs>
);
