import { useGetChatStatusQuery, type ChatTool } from '@/api/chat';
import { STATUS_COPY } from './ChatStatusBar.constants';
import { Bar, Pill } from './ChatStatusBar.styles';

/** Groups the tool list by where each tool came from. */
const countBySource = (tools: ChatTool[]) =>
  [
    ...tools.reduce(
      (counts, { source }) => counts.set(source, (counts.get(source) ?? 0) + 1),
      new Map<string, number>(),
    ),
  ];

/** Shows which local model is answering and whether its tools are wired up. */
export const ChatStatusBar = () => {
  const { data: status } = useGetChatStatusQuery();
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
