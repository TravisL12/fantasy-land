import { Button } from '@/components/Button';
import { ChatComposer } from '@/components/ChatComposer';
import { DashboardView } from '@/components/DashboardView';
import { HeaderLink } from '@/components/HeaderLink';
import { MessageBubble } from '@/components/MessageBubble';
import { PageHeader } from '@/components/PageHeader';
import { STATUS_VARIANTS, StatusMessage } from '@/components/StatusMessage';
import { ROUTES, buildDashboardPath } from '@/router/routes.constants';
import {
  BUILDER_COPY,
  BUILDER_MODES,
  EDIT_SUGGESTIONS,
  SUGGESTIONS,
} from './DashboardBuilderPage.constants';
import { useDashboardBuilder } from './DashboardBuilderPage.hooks';
import {
  Conversation,
  Pane,
  Placeholder,
  Split,
  Suggestion,
  Suggestions,
} from './DashboardBuilderPage.styles';

export const DashboardBuilderPage = () => {
  const {
    turns,
    isStreaming,
    error,
    send,
    stop,
    dashboardId,
    dashboard,
    isLoading,
    loadError,
    spec,
    buildId,
    save,
    isSaving,
    saveError,
  } = useDashboardBuilder();

  const isEditing = !!dashboardId;
  const copy = isEditing ? BUILDER_MODES.edit : BUILDER_MODES.create;
  const suggestions = isEditing ? EDIT_SUGGESTIONS : SUGGESTIONS;

  if (isEditing && isLoading) {
    return <StatusMessage>{BUILDER_COPY.loading}</StatusMessage>;
  }

  if (isEditing && !dashboard) {
    return (
      <StatusMessage variant={STATUS_VARIANTS.error}>
        {loadError ?? BUILDER_COPY.missing}
      </StatusMessage>
    );
  }

  return (
    <>
      <PageHeader
        title={copy.heading}
        subtitle={copy.subheading}
        back={{
          to: dashboardId ? buildDashboardPath(dashboardId) : ROUTES.dashboards,
          label: copy.back,
        }}
        actions={
          <HeaderLink to={ROUTES.dashboardExamples}>
            {BUILDER_COPY.examples}
          </HeaderLink>
        }
      />

      <Split>
        <Pane>
          {turns.length === 0 && (
            <Suggestions>
              {suggestions.map((suggestion) => (
                <Suggestion key={suggestion} onClick={() => void send(suggestion)}>
                  {suggestion}
                </Suggestion>
              ))}
            </Suggestions>
          )}
          <Conversation>
            {turns.map((turn, index) => (
              <MessageBubble
                key={turn.id}
                turn={turn}
                isStreaming={isStreaming && index === turns.length - 1}
              />
            ))}
          </Conversation>
          {error && (
            <StatusMessage variant={STATUS_VARIANTS.error}>{error}</StatusMessage>
          )}
          <ChatComposer
            isStreaming={isStreaming}
            onSend={(text) => void send(text)}
            onStop={stop}
            placeholder={BUILDER_COPY.placeholder}
          />
        </Pane>

        <Pane>
          {saveError && (
            <StatusMessage variant={STATUS_VARIANTS.error}>
              {saveError}
            </StatusMessage>
          )}
          {spec ? (
            <DashboardView
              key={buildId}
              spec={spec}
              actions={
                <Button onClick={() => void save()} disabled={isSaving}>
                  {isSaving ? BUILDER_COPY.saving : copy.save}
                </Button>
              }
            />
          ) : (
            <Placeholder>{BUILDER_COPY.empty}</Placeholder>
          )}
        </Pane>
      </Split>
    </>
  );
};
