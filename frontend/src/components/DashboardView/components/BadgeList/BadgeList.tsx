import { DEFAULT_LABEL_PATH } from '@/api/dashboards';
import { DASHBOARD_VIEW_COPY } from '../../DashboardView.constants';
import { formatCell, getPath, statusTone } from '../../DashboardView.utils';
import { Chip, Empty, List, Name, Note, Row } from './BadgeList.styles';
import type { BadgeListProps } from './BadgeList.types';

/** Availability, form, confirmed-or-projected: the state of each row, in a word. */
export const BadgeList = ({ widget, rows }: BadgeListProps) => {
  const shown = widget.limit ? rows.slice(0, widget.limit) : rows;

  if (shown.length === 0) return <Empty>{DASHBOARD_VIEW_COPY.empty}</Empty>;

  return (
    <List>
      {shown.map((row, index) => {
        const status = formatCell(getPath(row, widget.statusPath));
        const note = widget.notePath
          ? formatCell(getPath(row, widget.notePath))
          : undefined;

        return (
          <Row key={index}>
            <Name>
              {formatCell(
                getPath(row, widget.labelPath ?? DEFAULT_LABEL_PATH) ?? index + 1,
              )}
            </Name>
            <Chip $tone={statusTone(status)}>{status}</Chip>
            {note && <Note>{note}</Note>}
          </Row>
        );
      })}
    </List>
  );
};
