import { BUTTON_VARIANTS } from './Button.constants';
import { StyledButton } from './Button.styles';
import type { ButtonProps } from './Button.types';

export const Button = ({
  variant = BUTTON_VARIANTS.primary,
  type = 'button',
  ...rest
}: ButtonProps) => <StyledButton $variant={variant} type={type} {...rest} />;
