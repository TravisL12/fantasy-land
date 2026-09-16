import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { Button } from '@/components/Button';
import { CHAT_COPY, SUBMIT_KEY } from '../../ChatPage.constants';
import { Form, Input } from './ChatComposer.styles';
import type { ChatComposerProps } from './ChatComposer.types';

export const ChatComposer = ({
  isStreaming,
  onSend,
  onStop,
}: ChatComposerProps) => {
  const [text, setText] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (isStreaming || !text.trim()) return;
    onSend(text);
    setText('');
  };

  // Enter sends, Shift+Enter starts a new line.
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === SUBMIT_KEY && !event.shiftKey) submit(event);
  };

  return (
    <Form onSubmit={submit}>
      <Input
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={CHAT_COPY.placeholder}
        aria-label={CHAT_COPY.placeholder}
        rows={1}
      />
      {isStreaming ? (
        <Button type="button" onClick={onStop}>
          {CHAT_COPY.stop}
        </Button>
      ) : (
        <Button type="submit" disabled={!text.trim()}>
          {CHAT_COPY.send}
        </Button>
      )}
    </Form>
  );
};
