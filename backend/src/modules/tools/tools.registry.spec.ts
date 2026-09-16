import { BadRequestException } from '@nestjs/common';
import type { McpService } from '../mcp/mcp.service.js';
import { LOCAL_TOOL_SOURCE } from './tools.constants.js';
import { ToolRegistry } from './tools.registry.js';
import type { FantasyTool } from './tools.types.js';

const localTool = (name: string, execute: FantasyTool['execute']): FantasyTool => ({
  definition: { name, source: LOCAL_TOOL_SOURCE, description: '', parameters: {} },
  execute,
});

const mcpStub = (tools: { name: string }[] = []) =>
  ({
    listTools: vi.fn().mockResolvedValue(
      tools.map(({ name }) => ({
        name,
        server: 'sleeper',
        description: '',
        parameters: {},
      })),
    ),
    callTool: vi.fn().mockResolvedValue({ text: 'from mcp', isError: false }),
  }) as unknown as McpService;

describe('ToolRegistry', () => {
  it('offers local tools alongside the MCP servers\' tools', async () => {
    const mcp = mcpStub([{ name: 'get_nfl_state' }]);
    const registry = new ToolRegistry([localTool('find_player', vi.fn())], mcp);

    await expect(registry.listTools()).resolves.toEqual([
      expect.objectContaining({ name: 'find_player', source: LOCAL_TOOL_SOURCE }),
      expect.objectContaining({ name: 'get_nfl_state', source: 'sleeper' }),
    ]);
  });

  it('hides an MCP tool that a local tool already covers', async () => {
    const registry = new ToolRegistry(
      [localTool('compare_players', vi.fn())],
      mcpStub([{ name: 'compare_players' }, { name: 'get_nfl_state' }]),
    );

    const names = (await registry.listTools()).map((tool) => tool.name);
    expect(names).toEqual(['compare_players', 'get_nfl_state']);
  });

  it('runs a local tool and serializes its result', async () => {
    const registry = new ToolRegistry(
      [localTool('find_player', vi.fn().mockResolvedValue({ id: '11834' }))],
      mcpStub(),
    );

    await expect(registry.callTool('find_player', {})).resolves.toEqual({
      text: '{"id":"11834"}',
      isError: false,
    });
  });

  it('routes an unknown tool to the MCP servers', async () => {
    const mcp = mcpStub();
    const registry = new ToolRegistry([], mcp);

    await expect(registry.callTool('get_nfl_state', { a: 1 })).resolves.toEqual({
      text: 'from mcp',
      isError: false,
    });
    expect(mcp.callTool).toHaveBeenCalledWith('get_nfl_state', { a: 1 });
  });

  it('returns a validation message as a tool error so the model can correct itself', async () => {
    const registry = new ToolRegistry(
      [
        localTool('get_leaderboard', () => {
          throw new BadRequestException('Unknown stat group "passing"');
        }),
      ],
      mcpStub(),
    );

    await expect(registry.callTool('get_leaderboard', {})).resolves.toEqual({
      text: 'Unknown stat group "passing"',
      isError: true,
    });
  });
});
