import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { LOCAL_TOOL_SOURCE } from '../tools/tools.constants.js';
import type { ToolRegistry } from '../tools/tools.registry.js';
import { McpServerService } from './mcp-server.service.js';

const registryStub = () =>
  ({
    listLocalTools: vi.fn().mockReturnValue([
      {
        name: 'find_player',
        source: LOCAL_TOOL_SOURCE,
        description: 'Find players by name.',
        parameters: {
          type: 'object',
          properties: { query: { type: 'string' } },
          required: ['query'],
        },
      },
    ]),
    callLocalTool: vi
      .fn()
      .mockResolvedValue({ text: '{"id":"11834"}', isError: false }),
  }) as unknown as ToolRegistry;

/** Drives the real MCP server through a real MCP client, minus the network. */
const connect = async (registry: ToolRegistry) => {
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await new McpServerService(registry).createServer().connect(serverTransport);

  const client = new Client({ name: 'test', version: '1.0.0' });
  await client.connect(clientTransport);
  return client;
};

describe('McpServerService', () => {
  it('advertises our tools with their JSON Schema', async () => {
    const client = await connect(registryStub());

    const { tools } = await client.listTools();

    expect(tools).toEqual([
      {
        name: 'find_player',
        description: 'Find players by name.',
        inputSchema: {
          type: 'object',
          properties: { query: { type: 'string' } },
          required: ['query'],
        },
      },
    ]);
    await client.close();
  });

  it('runs a tool and returns its output as text content', async () => {
    const registry = registryStub();
    const client = await connect(registry);

    const result = await client.callTool({
      name: 'find_player',
      arguments: { query: 'vele' },
    });

    expect(result.content).toEqual([{ type: 'text', text: '{"id":"11834"}' }]);
    expect(registry.callLocalTool).toHaveBeenCalledWith('find_player', {
      query: 'vele',
    });
    await client.close();
  });

  it('reports a tool failure as isError rather than a protocol error', async () => {
    const registry = registryStub();
    vi.mocked(registry.callLocalTool).mockResolvedValue({
      text: 'No players matched "nobody"',
      isError: true,
    });
    const client = await connect(registry);

    const result = await client.callTool({
      name: 'find_player',
      arguments: { query: 'nobody' },
    });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual([
      { type: 'text', text: 'No players matched "nobody"' },
    ]);
    await client.close();
  });
});
