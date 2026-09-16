import { useEffect, useRef } from 'react';
import { streamChat } from '@/api/chat';
import { ChatComposer } from '@/components/ChatComposer';
import { MessageBubble } from '@/components/MessageBubble';
import { PageHeader } from '@/components/PageHeader';
import { STATUS_VARIANTS, StatusMessage } from '@/components/StatusMessage';
import { useChatStream } from '@/hooks';
import { CHAT_COPY, SUGGESTIONS } from './ChatPage.constants';
import {
  Conversation,
  Fixed,
  Shell,
  Suggestion,
  Suggestions,
} from './ChatPage.styles';
import { ChatStatusBar } from './components/ChatStatusBar';

export const ChatPage = () => {
  const { turns, isStreaming, error, send, stop } = useChatStream(streamChat);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [turns]);

  return (
    <Shell>
      <Fixed>
        <ChatStatusBar />
      </Fixed>

      <Conversation>
        <PageHeader title={CHAT_COPY.heading} subtitle={CHAT_COPY.subheading} />
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

      <Fixed>
        {error && (
          <StatusMessage variant={STATUS_VARIANTS.error}>{error}</StatusMessage>
        )}
        <ChatComposer
          isStreaming={isStreaming}
          onSend={send}
          onStop={stop}
          placeholder={CHAT_COPY.placeholder}
        />
      </Fixed>
    </Shell>
  );
};
