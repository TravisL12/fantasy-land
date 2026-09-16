export interface ChatComposerProps {
  isStreaming: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  /** Defaults to the generic prompt — each page describes its own job. */
  placeholder?: string;
}
