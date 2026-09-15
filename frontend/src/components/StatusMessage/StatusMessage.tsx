import { STATUS_VARIANTS } from './StatusMessage.constants';
import { Message } from './StatusMessage.styles';
import type { StatusMessageProps } from './StatusMessage.types';

export const StatusMessage = ({
  variant = STATUS_VARIANTS.info,
  children,
}: StatusMessageProps) => (
  <Message
    $variant={variant}
    role={variant === STATUS_VARIANTS.error ? 'alert' : 'status'}
  >
    {children}
  </Message>
);
