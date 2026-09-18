import { ChatComposer } from '@/components/ChatComposer';
import { DashboardView } from '@/components/DashboardView';
import { MessageBubble } from '@/components/MessageBubble';
import { PageHeader } from '@/components/PageHeader';
import { STATUS_VARIANTS, StatusMessage } from '@/components/StatusMessage';
import { Button } from '@/components/Button';
import { HeaderLink } from '@/components/HeaderLink';
import { ROUTES } from '@/router/routes.constants';
import { CREATE_COPY, SUGGESTIONS } from './DashboardCreatePage.constants';
import { useDashboardBuilder } from './DashboardCreatePage.hooks';
import {
  Conversation,
  Pane,
  Placeholder,
  Split,
  Suggestion,
  Suggestions,
} from './DashboardCreatePage.styles';

export const DashboardCreatePage = () => {
  const {
    turns,
    isStreaming,
    error,
    send,
    stop,
    spec,
    buildId,
    save,
    isSaving,
    saveError,
  } = useDashboardBuilder();

  return (
    <>
      <PageHeader
        title={CREATE_COPY.heading}
        subtitle={CREATE_COPY.subheading}
        back={{ to: ROUTES.dashboards, label: CREATE_COPY.back }}
        actions={
          <HeaderLink to={ROUTES.dashboardExamples}>
            {CREATE_COPY.examples}
          </HeaderLink>
        }
      />

      <Split>
        <Pane>
          {turns.length === 0 && (
            <Suggestions>
              {SUGGESTIONS.map((suggestion) => (
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
            placeholder={CREATE_COPY.placeholder}
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
                  {isSaving ? CREATE_COPY.saving : CREATE_COPY.save}
                </Button>
              }
            />
          ) : (
            <Placeholder>{CREATE_COPY.empty}</Placeholder>
          )}
        </Pane>
      </Split>
    </>
  );
};
