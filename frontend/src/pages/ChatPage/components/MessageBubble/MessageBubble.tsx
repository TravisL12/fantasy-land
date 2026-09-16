import { CHAT_ROLES } from '@/api/chat';
import { Markdown } from '@/components/Markdown';
import { CHAT_COPY } from '../../ChatPage.constants';
import { ToolCallList } from '../ToolCallList';
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
            <summary>{CHAT_COPY.thinkingLabel}</summary>
            <pre>{thinking}</pre>
          </Thinking>
        )}
        {isAssistant && <ToolCallList calls={toolCalls} />}
        {isEmpty && <Muted>{CHAT_COPY.emptyAnswer}</Muted>}
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
