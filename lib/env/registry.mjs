// NeatCode agent knowledge: the curated layer over the upstream registry.
//
// The upstream registry (lib/env/upstream-agents.mjs, mechanically ported
// from vercel-labs/skills) knows skill directories and config-presence probes
// for ~80 agents. This module adds what NeatCode's environment questions need
// and the upstream table does not have: executables to probe on PATH, version
// arguments, and MCP/agent-service configuration locations.
//
// Provenance per entry: `mcp-sync` marks locations confirmed against
// EnjoyableWork/mcp-sync sources; `public-docs` marks stable documented
// formats; `registry` marks facts inherited from the upstream table.
// No undocumented config locations are invented — an agent without a curated
// entry still gets skills-dir and config-presence discovery from upstream.
//
// Templates: {home} {configHome} {codexHome} {claudeHome} {kiroHome} {project}
// {userData} (platform VS Code user-data dir). Env overrides from the upstream
// table (CODEX_HOME, CLAUDE_CONFIG_DIR, KIRO_HOME, XDG_CONFIG_HOME) apply.

export const AGENT_KNOWLEDGE = {
  'claude-code': {
    executables: ['claude'],
    versionArgs: ['--version'],
    mcp: [
      { format: 'json', scope: 'global', path: '{home}/.claude.json', key: 'mcpServers', via: 'public-docs' },
      { format: 'json', scope: 'project', path: '{project}/.mcp.json', key: 'mcpServers', via: 'public-docs' },
    ],
  },
  codex: {
    executables: ['codex'],
    versionArgs: ['--version'],
    mcp: [
      { format: 'toml', scope: 'global', path: '{codexHome}/config.toml', key: 'mcp_servers', via: 'mcp-sync' },
      { format: 'toml', scope: 'project', path: '{project}/.codex/config.toml', key: 'mcp_servers', via: 'mcp-sync' },
    ],
  },
  cursor: {
    executables: ['cursor', 'cursor-agent'],
    versionArgs: ['--version'],
    mcp: [
      { format: 'json', scope: 'global', path: '{home}/.cursor/mcp.json', key: 'mcpServers', via: 'mcp-sync' },
      { format: 'json', scope: 'project', path: '{project}/.cursor/mcp.json', key: 'mcpServers', via: 'mcp-sync' },
    ],
  },
  'github-copilot': {
    executables: ['copilot'],
    versionArgs: ['--version'],
    mcp: [
      { format: 'json', scope: 'global', path: '{home}/.copilot/mcp-config.json', key: 'mcpServers', via: 'mcp-sync' },
      { format: 'json', scope: 'global', path: '{userData}/Code/User/mcp.json', key: 'servers', via: 'mcp-sync' },
      { format: 'json', scope: 'project', path: '{project}/.vscode/mcp.json', key: 'servers', via: 'mcp-sync' },
    ],
  },
  cline: {
    executables: [],
    versionArgs: [],
    mcp: [
      { format: 'json', scope: 'global', path: '{configHome}/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json', key: 'mcpServers', via: 'mcp-sync', platform: 'linux' },
      { format: 'json', scope: 'global', path: '{home}/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json', key: 'mcpServers', via: 'mcp-sync', platform: 'macos' },
    ],
  },
  opencode: {
    executables: ['opencode'],
    versionArgs: ['--version'],
    mcp: [
      { format: 'json', scope: 'global', path: '{configHome}/opencode/opencode.json', key: 'mcp', via: 'public-docs' },
      { format: 'json', scope: 'global', path: '{configHome}/opencode/opencode.jsonc', key: 'mcp', via: 'public-docs' },
      { format: 'json', scope: 'project', path: '{project}/opencode.json', key: 'mcp', via: 'public-docs' },
      { format: 'json', scope: 'project', path: '{project}/opencode.jsonc', key: 'mcp', via: 'public-docs' },
    ],
  },
  'gemini-cli': {
    executables: ['gemini'],
    versionArgs: ['--version'],
    mcp: [
      { format: 'json', scope: 'global', path: '{home}/.gemini/settings.json', key: 'mcpServers', via: 'public-docs' },
      { format: 'json', scope: 'project', path: '{project}/.gemini/settings.json', key: 'mcpServers', via: 'public-docs' },
    ],
  },
  windsurf: {
    executables: ['windsurf'],
    versionArgs: ['--version'],
    mcp: [
      { format: 'json', scope: 'global', path: '{home}/.codeium/windsurf/mcp_config.json', key: 'mcpServers', via: 'mcp-sync' },
    ],
  },
  'kiro-cli': {
    executables: ['kiro-cli', 'kiro'],
    versionArgs: ['--version'],
    mcp: [
      { format: 'json', scope: 'global', path: '{kiroHome}/settings/mcp.json', key: 'mcpServers', via: 'mcp-sync' },
    ],
  },
  zed: {
    executables: ['zed'],
    versionArgs: ['--version'],
    mcp: [
      { format: 'json', scope: 'global', path: '{configHome}/zed/settings.json', key: 'context_servers', via: 'public-docs', platform: 'linux' },
      { format: 'json', scope: 'global', path: '{home}/Library/Application Support/Zed/settings.json', key: 'context_servers', via: 'public-docs', platform: 'macos' },
      { format: 'json', scope: 'global', path: '{userData}/Zed/settings.json', key: 'context_servers', via: 'public-docs', platform: 'windows' },
    ],
  },
  roo: {
    executables: [],
    versionArgs: [],
    mcp: [
      { format: 'json', scope: 'global', path: '{configHome}/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/mcp_settings.json', key: 'mcpServers', via: 'public-docs', platform: 'linux' },
      { format: 'json', scope: 'global', path: '{home}/Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/mcp_settings.json', key: 'mcpServers', via: 'public-docs', platform: 'macos' },
      { format: 'json', scope: 'project', path: '{project}/.roo/mcp.json', key: 'mcpServers', via: 'public-docs' },
    ],
  },
  crush: {
    executables: ['crush'],
    versionArgs: ['--version'],
    mcp: [],
  },
  amp: {
    executables: ['amp'],
    versionArgs: ['--version'],
    mcp: [],
  },
  goose: {
    executables: ['goose'],
    versionArgs: ['--version'],
    mcp: [],
  },
  aider: {
    executables: ['aider'],
    versionArgs: ['--version'],
    mcp: [],
  },
};

/** Resolve {placeholders} against a context. Unknown placeholders are left intact. */
export function resolvePlaceholders(template, ctx) {
  return template.replace(/\{(\w+)\}/g, (_, name) =>
    ctx[name] !== undefined ? ctx[name] : `{${name}}`,
  );
}

/** Build the template context for this machine (and optionally a project root). */
export function templateContext({ home, configHome, project = null } = {}) {
  const os = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'macos' : 'linux';
  const userData =
    os === 'macos'
      ? `${home}/Library/Application Support`
      : os === 'windows'
        ? `${process.env.APPDATA ?? `${home}/AppData/Roaming`}`
        : (process.env.XDG_CONFIG_HOME?.trim() || `${home}/.config`);
  return {
    home,
    configHome: configHome ?? `${home}/.config`,
    project: project ?? '{project}',
    codexHome: process.env.CODEX_HOME?.trim() || `${home}/.codex`,
    claudeHome: process.env.CLAUDE_CONFIG_DIR?.trim() || `${home}/.claude`,
    kiroHome: process.env.KIRO_HOME?.trim() || `${home}/.kiro`,
    userData,
    platform: os,
  };
}
