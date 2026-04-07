/**
 * OpenClaw passthrough adapter.
 *
 * Handles requests from OpenClaw (detected via openclaw/* User-Agent).
 * OpenClaw manages its own tool execution loop, so this adapter forces
 * passthrough mode — the proxy returns tool_use blocks to OpenClaw for
 * execution rather than running them internally.
 *
 * Key characteristics:
 * - Passthrough mode always enabled
 * - Streaming: respects the client's stream parameter (body.stream)
 * - CWD: defaults to ~/.openclaw/workspace
 * - MCP server name: "oc" (tools appear as mcp__oc__*)
 * - File change tracking: maps OpenClaw's tool names to file operations
 */

import type { Context } from "hono"
import type { AgentAdapter } from "../adapter"
import type { FileChange } from "../fileChanges"
import { extractFileChangesFromBash } from "../fileChanges"
import { normalizeContent } from "../messages"
import { homedir } from "os"
import { join } from "path"

const MCP_SERVER_NAME = "oc"

const ALLOWED_MCP_TOOLS: readonly string[] = [
  `mcp__${MCP_SERVER_NAME}__read`,
  `mcp__${MCP_SERVER_NAME}__write`,
  `mcp__${MCP_SERVER_NAME}__edit`,
  `mcp__${MCP_SERVER_NAME}__exec`,
  `mcp__${MCP_SERVER_NAME}__process`,
  `mcp__${MCP_SERVER_NAME}__cron`,
  `mcp__${MCP_SERVER_NAME}__web_search`,
  `mcp__${MCP_SERVER_NAME}__web_fetch`,
  `mcp__${MCP_SERVER_NAME}__memory_search`,
  `mcp__${MCP_SERVER_NAME}__memory_get`,
  `mcp__${MCP_SERVER_NAME}__sessions_list`,
  `mcp__${MCP_SERVER_NAME}__sessions_history`,
  `mcp__${MCP_SERVER_NAME}__sessions_send`,
  `mcp__${MCP_SERVER_NAME}__sessions_yield`,
  `mcp__${MCP_SERVER_NAME}__sessions_spawn`,
  `mcp__${MCP_SERVER_NAME}__subagents`,
  `mcp__${MCP_SERVER_NAME}__session_status`,
]

export const openClawAdapter: AgentAdapter = {
  name: "openclaw",

  getSessionId(c: Context): string | undefined {
    return c.req.header("x-openclaw-session-id")
  },

  extractWorkingDirectory(_body: any): string | undefined {
    return join(homedir(), ".openclaw", "workspace")
  },

  normalizeContent(content: any): string {
    return normalizeContent(content)
  },

  getBlockedBuiltinTools(): readonly string[] {
    return []
  },

  getAgentIncompatibleTools(): readonly string[] {
    return []
  },

  getMcpServerName(): string {
    return MCP_SERVER_NAME
  },

  getAllowedMcpTools(): readonly string[] {
    return ALLOWED_MCP_TOOLS
  },

  buildSdkAgents(_body: any, _mcpToolNames: readonly string[]): Record<string, any> {
    return {}
  },

  buildSdkHooks(_body: any, _sdkAgents: Record<string, any>): undefined {
    return undefined
  },

  buildSystemContextAddendum(_body: any, _sdkAgents: Record<string, any>): string {
    return ""
  },

  usesPassthrough(): boolean {
    return true
  },

  prefersStreaming(body: any): boolean {
    return body?.stream === true
  },

  extractFileChangesFromToolUse(toolName: string, toolInput: unknown): FileChange[] {
    const input = toolInput as Record<string, unknown> | null | undefined
    const filePath = input?.path ?? input?.filePath ?? input?.file_path

    const lowerName = toolName.toLowerCase()
    if (lowerName === "write" && filePath) {
      return [{ operation: "wrote", path: String(filePath) }]
    }
    if (lowerName === "edit" && filePath) {
      return [{ operation: "edited", path: String(filePath) }]
    }
    if (lowerName === "exec" && input?.command) {
      return extractFileChangesFromBash(String(input.command))
    }
    return []
  },
}
