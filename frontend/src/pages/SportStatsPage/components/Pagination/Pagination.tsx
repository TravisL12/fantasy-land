import { BUTTON_VARIANTS, Button } from '@/components/Button';
import { PAGINATION_COPY } from './Pagination.constants';
import { Bar, Buttons, Range } from './Pagination.styles';
import type { PaginationProps } from './Pagination.types';

export const Pagination = ({
  page,
  pageSize,
  total,
  onPageChange,
}: PaginationProps) => {
  if (total === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <Bar aria-label="Pagination">
      <Range>{PAGINATION_COPY.range(from, to, total)}</Range>
      <Buttons>
        <Button
          variant={BUTTON_VARIANTS.ghost}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          {PAGINATION_COPY.previous}
        </Button>
        <Button
          variant={BUTTON_VARIANTS.ghost}
          disabled={to >= total}
          onClick={() => onPageChange(page + 1)}
        >
          {PAGINATION_COPY.next}
        </Button>
      </Buttons>
    </Bar>
  );
};
