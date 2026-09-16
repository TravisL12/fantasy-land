import { TOOL_COPY, TOOL_STATUS_ICONS } from './ToolCallList.constants';
import { Args, Call, List, Output, Status, Summary } from './ToolCallList.styles';
import type { ToolCallListProps } from './ToolCallList.types';

export const ToolCallList = ({ calls }: ToolCallListProps) => {
  if (calls.length === 0) return null;

  return (
    <List>
      {calls.map(({ id, name, arguments: args, status, result }) => (
        <Call key={id}>
          <details>
            <Summary>
              <Status $status={status}>{TOOL_STATUS_ICONS[status]}</Status>
              {name}
              <Args>{JSON.stringify(args)}</Args>
            </Summary>
            <Output>{result ?? TOOL_COPY.pending}</Output>
          </details>
        </Call>
      ))}
    </List>
  );
};
