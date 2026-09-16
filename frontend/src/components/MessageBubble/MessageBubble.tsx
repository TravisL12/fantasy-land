import { CHAT_ROLES } from '@/api/chat';
import { Markdown } from '@/components/Markdown';
import { MESSAGE_COPY } from './MessageBubble.constants';
import { ToolCallList } from './components/ToolCallList';
import {
  Bubble,
  Caret,
  Muted,
  PlainText,
  Row,
  Thinking,
} from './MessageBubble.styles';
import type { MessageBubbleProps } from './MessageBubble.types';

export const MessageBubble = ({ turn, isStreaming }: MessageBubbleProps) => {
  const { role, content, thinking, toolCalls } = turn;
  const isAssistant = role === CHAT_ROLES.assistant;
  const isEmpty = !content && !isStreaming;

  return (
    <Row $role={role}>
      <Bubble $role={role}>
        {isAssistant && thinking && (
          <Thinking>
            <summary>{MESSAGE_COPY.thinkingLabel}</summary>
            <pre>{thinking}</pre>
          </Thinking>
        )}
        {isAssistant && <ToolCallList calls={toolCalls} />}
        {isEmpty && <Muted>{MESSAGE_COPY.emptyAnswer}</Muted>}
        {content &&
          (isAssistant ? (
            <Markdown>{content}</Markdown>
          ) : (
            <PlainText>{content}</PlainText>
          ))}
        {isStreaming && <Caret />}
      </Bubble>
    </Row>
  );
};
