import { useGetChatStatusQuery } from '@/api/chat';
import { STATUS_COPY, STATUS_POLL_MS } from './ChatStatusBar.constants';
import { Bar, Pill } from './ChatStatusBar.styles';
import { countBySource } from './ChatStatusBar.utils';

/**
 * Shows which local model is answering and whether its tools are wired up. The
 * poll doubles as the keep-warm heartbeat: the backend warms the model on every
 * status request, so the model stays loaded exactly while this page is open.
 */
export const ChatStatusBar = () => {
  const { data: status } = useGetChatStatusQuery(undefined, {
    pollingInterval: STATUS_POLL_MS,
    skipPollingIfUnfocused: true,
  });
  if (!status) return null;

  const { model, baseUrl, available, modelAvailable, tools } = status;

  return (
    <Bar>
      <Pill>{model}</Pill>
      {!available && <Pill $warn>{STATUS_COPY.offline(baseUrl)}</Pill>}
      {available && !modelAvailable && (
        <Pill $warn>{STATUS_COPY.missingModel(model)}</Pill>
      )}
      {tools.length > 0 ? (
        countBySource(tools).map(([source, count]) => (
          <Pill key={source}>{STATUS_COPY.tools(source, count)}</Pill>
        ))
      ) : (
        <Pill $warn>{STATUS_COPY.noTools}</Pill>
      )}
    </Bar>
  );
};
