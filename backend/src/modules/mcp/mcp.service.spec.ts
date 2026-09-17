import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { McpConfig, McpServerConfig } from '../../config/mcp.config.js';
import { MCP_MESSAGES } from './mcp.constants.js';
import { McpService } from './mcp.service.js';

const build = (servers: McpServerConfig[]) =>
  new McpService({
    getOrThrow: () => ({ servers }) as McpConfig,
  } as unknown as ConfigService);

describe('McpService', () => {
  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it('exposes no tools when no servers are configured', async () => {
    await expect(build([]).listTools()).resolves.toEqual([]);
  });

  it('reports an unknown tool instead of throwing', async () => {
    const result = await build([]).callTool('get_nfl_state', {});

    expect(result).toEqual({
      text: MCP_MESSAGES.unknownTool('get_nfl_state'),
      isError: true,
    });
  });

  it('keeps running when a server fails to start', async () => {
    const service = build([
      { name: 'broken', command: 'definitely-not-a-real-binary', args: [] },
    ]);

    await expect(service.listTools()).resolves.toEqual([]);
    expect(Logger.prototype.error).toHaveBeenCalledWith(
      expect.stringContaining(MCP_MESSAGES.connectFailed('broken')),
    );
  });

  it('connects to a real stdio server once and lists its tools', async () => {
    const service = build([
      {
        name: 'sleeper',
        command: process.execPath,
        args: [require.resolve('sleeper-mcp')],
      },
    ]);

    const tools = await service.listTools();
    // Second call must reuse the connection rather than spawn again.
    expect(await service.listTools()).toEqual(tools);

    expect(tools.length).toBeGreaterThan(0);
    expect(tools.map((tool) => tool.name)).toContain('get_nfl_state');
    expect(tools[0].server).toBe('sleeper');

    await service.onModuleDestroy();
  });

  it('hides denied tools, so they never reach the model or run', async () => {
    const service = build([
      {
        name: 'sleeper',
        command: process.execPath,
        args: [require.resolve('sleeper-mcp')],
        denyTools: ['clear_cache'],
      },
    ]);

    const names = (await service.listTools()).map((tool) => tool.name);
    expect(names).not.toContain('clear_cache');
    expect(names).toContain('get_nfl_state');

    await expect(service.callTool('clear_cache', {})).resolves.toEqual({
      text: MCP_MESSAGES.unknownTool('clear_cache'),
      isError: true,
    });

    await service.onModuleDestroy();
  });

  it('exposes only the allowed tools when allowTools is set', async () => {
    const service = build([
      {
        name: 'sleeper',
        command: process.execPath,
        args: [require.resolve('sleeper-mcp')],
        allowTools: ['get_nfl_state'],
      },
    ]);

    expect((await service.listTools()).map((tool) => tool.name)).toEqual([
      'get_nfl_state',
    ]);

    await service.onModuleDestroy();
  });
});
