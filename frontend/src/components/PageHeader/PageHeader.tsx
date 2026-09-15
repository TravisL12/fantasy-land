import { BACK_ARROW } from './PageHeader.constants';
import { BackLink, Header, Subtitle, Title } from './PageHeader.styles';
import type { PageHeaderProps } from './PageHeader.types';

export const PageHeader = ({ title, subtitle, back }: PageHeaderProps) => (
  <Header>
    {back && (
      <BackLink to={back.to}>
        {BACK_ARROW} {back.label}
      </BackLink>
    )}
    <Title>{title}</Title>
    {subtitle && <Subtitle>{subtitle}</Subtitle>}
  </Header>
);
