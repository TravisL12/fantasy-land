import { DEFAULT_LABEL_PATH, DEFAULT_METER_MAX } from '@/api/dashboards';
import { DASHBOARD_VIEW_COPY } from '../../DashboardView.constants';
import { Empty } from '../../DashboardView.styles';
import { formatCell, getPath, limitRows, toNumber } from '../../DashboardView.utils';
import { meterTone } from './MeterList.utils';
import { Fill, Heading, List, Reading, Row, Track } from './MeterList.styles';
import type { MeterListProps } from './MeterList.types';

/** A rating against its limit — a meter, not a one-bar bar chart. */
export const MeterList = ({ widget, rows }: MeterListProps) => {
  const max = widget.max ?? DEFAULT_METER_MAX;
  const shown = limitRows(rows, widget.limit);

  if (shown.length === 0) return <Empty>{DASHBOARD_VIEW_COPY.empty}</Empty>;

  return (
    <List>
      {shown.map((row, index) => {
        const value = toNumber(getPath(row, widget.valuePath));
        const label = formatCell(
          getPath(row, widget.labelPath ?? DEFAULT_LABEL_PATH) ?? index + 1,
        );
        const grade = widget.gradePath
          ? formatCell(getPath(row, widget.gradePath))
          : undefined;
        const percent = value === undefined ? 0 : Math.min(100, (value / max) * 100);

        return (
          <Row key={`${label}-${index}`}>
            <Heading>
              <span>{label}</span>
              {/* The grade is a word, so the rating never rests on color alone. */}
              <Reading>
                {formatCell(value)}
                {grade ? ` · ${grade}` : ''}
              </Reading>
            </Heading>
            <Track
              role="meter"
              aria-label={label}
              aria-valuenow={value}
              aria-valuemin={0}
              aria-valuemax={max}
            >
              <Fill $percent={percent} $tone={meterTone(percent)} />
            </Track>
          </Row>
        );
      })}
    </List>
  );
};
