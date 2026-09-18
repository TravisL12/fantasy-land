import { BACK_ARROW } from './PageHeader.constants';
import { BackLink, Header, Subtitle, Title, TitleRow } from './PageHeader.styles';
import type { PageHeaderProps } from './PageHeader.types';

export const PageHeader = ({ title, subtitle, back, actions }: PageHeaderProps) => (
  <Header>
    {back && (
      <BackLink to={back.to}>
        {BACK_ARROW} {back.label}
      </BackLink>
    )}
    <TitleRow>
      <Title>{title}</Title>
      {actions}
    </TitleRow>
    {subtitle && <Subtitle>{subtitle}</Subtitle>}
  </Header>
);
