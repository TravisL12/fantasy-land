import { Fragment } from 'react';
import { DashboardView } from '@/components/DashboardView';
import { HeaderLink } from '@/components/HeaderLink';
import { PageHeader } from '@/components/PageHeader';
import { ROUTES } from '@/router/routes.constants';
import {
  EXAMPLES_COPY,
  EXAMPLE_RUN,
  EXAMPLE_SPEC,
  EXAMPLE_SPEC_JSON,
  FORMAT_GUIDE,
  WIDGET_GUIDE,
} from './DashboardExamplesPage.constants';
import {
  Ask,
  Card,
  CardHeading,
  CardText,
  Cards,
  Detail,
  FormatExample,
  FormatName,
  FormatSummary,
  Formats,
  Kind,
  Lead,
  Section,
  SectionTitle,
  Spec,
  SpecCode,
} from './DashboardExamplesPage.styles';

/**
 * The reference for what a dashboard can be made of. The example at the bottom
 * is the real DashboardView rendering a real spec — only its data is fixed — so
 * a widget that changes shape changes here too, rather than drifting into a
 * screenshot nobody updates.
 */
export const DashboardExamplesPage = () => (
  <>
    <PageHeader
      title={EXAMPLES_COPY.heading}
      subtitle={EXAMPLES_COPY.subheading}
      back={{ to: ROUTES.dashboards, label: EXAMPLES_COPY.back }}
      actions={
        <HeaderLink to={EXAMPLES_COPY.createTo}>{EXAMPLES_COPY.create}</HeaderLink>
      }
    />

    <Section>
      <SectionTitle>{EXAMPLES_COPY.widgetsHeading}</SectionTitle>
      <Cards>
        {WIDGET_GUIDE.map((entry) => (
          <Card key={entry.type}>
            <CardHeading>
              {entry.title}
              <Kind>{entry.type}</Kind>
            </CardHeading>
            <CardText>{entry.summary}</CardText>
            <Detail>
              <strong>{EXAMPLES_COPY.needs}:</strong> {entry.needs}
            </Detail>
            <Ask>{entry.ask}</Ask>
          </Card>
        ))}
      </Cards>
    </Section>

    <Section>
      <SectionTitle>{EXAMPLES_COPY.formatsHeading}</SectionTitle>
      <Lead>{EXAMPLES_COPY.formatsIntro}</Lead>
      <Formats>
        {FORMAT_GUIDE.map((entry) => (
          <Fragment key={entry.format}>
            <FormatName>{entry.format}</FormatName>
            <FormatExample>{entry.example}</FormatExample>
            <FormatSummary>{entry.summary}</FormatSummary>
          </Fragment>
        ))}
      </Formats>
    </Section>

    <Section>
      <SectionTitle>{EXAMPLES_COPY.exampleHeading}</SectionTitle>
      <Lead>{EXAMPLES_COPY.exampleIntro}</Lead>
      <DashboardView spec={EXAMPLE_SPEC} sample={EXAMPLE_RUN} />
    </Section>

    <Section>
      <Spec>
        <summary>{EXAMPLES_COPY.specSummary}</summary>
        <SpecCode>{EXAMPLE_SPEC_JSON}</SpecCode>
      </Spec>
      <Lead>{EXAMPLES_COPY.specIntro}</Lead>
    </Section>
  </>
);
