import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CHAT_EVENTS,
  CHAT_ROLES,
  type ChatMessage,
  type ChatStreamEvent,
} from '@/api/chat';
import { TOOL_STATUSES } from '@/constants';
import type { ChatTurn } from '@/types';
import { DEFAULT_ERROR_MESSAGE } from '@/utils';

type StreamFn<TEvent> = (
  messages: ChatMessage[],
  signal: AbortSignal,
) => AsyncGenerator<TEvent>;

const newTurn = (role: ChatTurn['role'], content: string): ChatTurn => ({
  id: crypto.randomUUID(),
  role,
  content,
  thinking: '',
  toolCalls: [],
});

const toMessage = ({ role, content }: ChatTurn): ChatMessage => ({
  role,
  content,
});

/** Folds one stream event into the assistant turn it belongs to. */
const applyEvent = (
  turns: ChatTurn[],
  id: string,
  event: ChatStreamEvent,
): ChatTurn[] =>
  turns.map((turn) => {
    if (turn.id !== id) return turn;

    switch (event.type) {
      case CHAT_EVENTS.token:
        return { ...turn, content: turn.content + event.text };
      case CHAT_EVENTS.thinking:
        return { ...turn, thinking: turn.thinking + event.text };
      case CHAT_EVENTS.toolCall:
        return {
          ...turn,
          toolCalls: [
            ...turn.toolCalls,
            { ...event.call, status: TOOL_STATUSES.running },
          ],
        };
      case CHAT_EVENTS.toolResult:
        return {
          ...turn,
          toolCalls: turn.toolCalls.map((call) =>
            call.id === event.id
              ? {
                  ...call,
                  status: event.isError
                    ? TOOL_STATUSES.error
                    : TOOL_STATUSES.ok,
                  result: event.text,
                }
              : call,
          ),
        };
      default:
        return turn;
    }
  });

/**
 * Drives one streaming conversation. `stream` is the endpoint — the chat page
 * and the dashboard builder use the same loop with different backends, and
 * `onEvent` sees every event so a caller can pick up its own event types.
 */
export const useChatStream = <TEvent extends { type: string }>(
  stream: StreamFn<TEvent>,
  onEvent?: (event: TEvent) => void,
) => {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string>();
  const abortRef = useRef<AbortController | null>(null);
  // The send callback needs the history without re-creating itself each turn.
  const turnsRef = useRef<ChatTurn[]>([]);
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const update = useCallback((next: (prev: ChatTurn[]) => ChatTurn[]) => {
    setTurns((prev) => {
      turnsRef.current = next(prev);
      return turnsRef.current;
    });
  }, []);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const send = useCallback(
    async (text: string) => {
      const question = text.trim();
      if (!question || abortRef.current) return;

      const history = [
        ...turnsRef.current.map(toMessage),
        { role: CHAT_ROLES.user, content: question },
      ];
      const answer = newTurn(CHAT_ROLES.assistant, '');
      update((prev) => [...prev, newTurn(CHAT_ROLES.user, question), answer]);

      const controller = new AbortController();
      abortRef.current = controller;
      setIsStreaming(true);
      setError(undefined);

      try {
        for await (const event of stream(history, controller.signal)) {
          onEventRef.current?.(event);
          // Every stream is the chat stream plus, maybe, the caller's own events;
          // applyEvent ignores anything it does not recognize.
          const chatEvent = event as unknown as ChatStreamEvent;
          if (chatEvent.type === CHAT_EVENTS.error) setError(chatEvent.message);
          else update((prev) => applyEvent(prev, answer.id, chatEvent));
        }
      } catch (caught) {
        if (!controller.signal.aborted) {
          setError(
            caught instanceof Error ? caught.message : DEFAULT_ERROR_MESSAGE,
          );
        }
      } finally {
        abortRef.current = null;
        setIsStreaming(false);
      }
    },
    [stream, update],
  );

  return { turns, isStreaming, error, send, stop };
};
