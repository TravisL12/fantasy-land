import { useEffect, useRef } from 'react';
import { STATUS_VARIANTS, StatusMessage } from '@/components/StatusMessage';
import { PageHeader } from '@/components/PageHeader';
import { CHAT_COPY, SUGGESTIONS } from './ChatPage.constants';
import { useChat } from './ChatPage.hooks';
import { Conversation, Suggestion, Suggestions } from './ChatPage.styles';
import { ChatComposer } from './components/ChatComposer';
import { ChatStatusBar } from './components/ChatStatusBar';
import { MessageBubble } from './components/MessageBubble';

export const ChatPage = () => {
  const { turns, isStreaming, error, send, stop } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [turns]);

  return (
    <>
      <PageHeader title={CHAT_COPY.heading} subtitle={CHAT_COPY.subheading} />
      <ChatStatusBar />

      <Conversation>
        {turns.length === 0 && (
          <Suggestions>
            {SUGGESTIONS.map((suggestion) => (
              <Suggestion key={suggestion} onClick={() => send(suggestion)}>
                {suggestion}
              </Suggestion>
            ))}
          </Suggestions>
        )}
        {turns.map((turn, index) => (
          <MessageBubble
            key={turn.id}
            turn={turn}
            isStreaming={isStreaming && index === turns.length - 1}
          />
        ))}
        <div ref={bottomRef} />
      </Conversation>

      {error && (
        <StatusMessage variant={STATUS_VARIANTS.error}>{error}</StatusMessage>
      )}
      <ChatComposer isStreaming={isStreaming} onSend={send} onStop={stop} />
    </>
  );
};
