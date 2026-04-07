<p align="center">
  <img src="assets/banner.svg" alt="Ginny" width="800"/>
</p>

<p align="center">
  <a href="https://github.com/duchuyvp/ginny/releases"><img src="https://img.shields.io/github/v/release/duchuyvp/ginny?style=flat-square&color=6366f1&label=release" alt="Release"></a>
  <a href="https://www.npmjs.com/package/ginny"><img src="https://img.shields.io/npm/v/ginny?style=flat-square&color=8b5cf6&label=npm" alt="npm"></a>
  <a href="#"><img src="https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-a78bfa?style=flat-square" alt="Platform"></a>
  <a href="#"><img src="https://img.shields.io/badge/license-MIT-c4b5fd?style=flat-square" alt="License"></a>
  <a href="https://discord.gg/7vNVFYBz"><img src="https://img.shields.io/badge/discord-join-5865F2?style=flat-square&logo=discord&logoColor=white" alt="Discord"></a>
</p>

---

Ginny bridges the Claude Code SDK to the standard Anthropic API. No OAuth interception. No binary patches. No hacks. Just pure, documented SDK calls. Any tool that speaks the Anthropic or OpenAI protocol — OpenClaw, OpenCode, Crush, Cline, Aider, Pi, Droid, Open WebUI — connects to Ginny and gets Claude, with session management, streaming, and prompt caching handled natively by the SDK.

> [!NOTE]
> ### How Ginny works with Anthropic
>
> Ginny is built entirely on the [Claude Code SDK](https://docs.anthropic.com/en/docs/claude-code/sdk). Every request flows through `query()` — the same documented function Anthropic provides for programmatic access. No OAuth tokens are extracted, no binaries are patched, nothing is reverse-engineered.
>
> Because we use the SDK, Anthropic remains in full control of prompt caching, context window management, compaction, rate limiting, and authentication. Ginny doesn't bypass these mechanisms — it depends on them. Max subscription tokens flow through the correct channel, governed by the same guardrails Anthropic built into Claude Code.
>
> What Ginny adds is a **presentation and interoperability layer**. We translate Claude Code's output into the standard Anthropic API format so developers can connect the editors, terminals, and workflows they prefer. The SDK does the work; Ginny formats the result.
>
> If you're looking for a tool that circumvents usage limits or bypasses Anthropic's controls, this project is not for you. We play nice with the SDK because we believe that's how developers can continue to choose their own frontends while respecting Anthropic's platform.

> [!TIP]
> ### OpenClaw Support
>
> Ginny includes a dedicated OpenClaw adapter with full tool passthrough support. OpenClaw manages its own tool execution loop — Ginny returns `tool_use` blocks to OpenClaw for execution rather than running them internally. See [OpenClaw setup](#openclaw) below.

## Quick Start

```bash
# 1. Install
npm install -g @duchuyvp/ginny

# 2. Authenticate (one time)
claude login

# 3. Configure OpenCode plugin (one time — OpenCode users only)
ginny setup

# 4. Start
ginny
```

Ginny runs on `http://127.0.0.1:3456`. Point any Anthropic-compatible tool at it:

```bash
ANTHROPIC_API_KEY=x ANTHROPIC_BASE_URL=http://127.0.0.1:3456 opencode
```

The API key value is a placeholder — Ginny authenticates through the Claude Code SDK, not API keys. Most Anthropic-compatible tools require this field to be set, but any value works.

## Why Ginny?

The Claude Code SDK provides programmatic access to Claude. But your favorite coding tools expect an Anthropic API endpoint. Ginny bridges that gap — it runs locally, accepts standard API requests, and routes them through the SDK. Claude Code does the heavy lifting; Ginny translates the output.

<p align="center">
  <img src="assets/how-it-works.svg" alt="How Ginny works" width="920"/>
</p>

## Features

- **Standard Anthropic API** — drop-in compatible with any tool that supports a custom `base_url`
- **OpenAI-compatible API** — `/v1/chat/completions` and `/v1/models` for tools that only speak the OpenAI protocol (Open WebUI, Continue, etc.) — no LiteLLM needed
- **Session management** — conversations persist across requests, survive compaction and undo, resume after proxy restarts
- **Streaming** — full SSE streaming with MCP tool filtering
- **Concurrent sessions** — run parent and subagent requests in parallel
- **Subagent model selection** — primary agents get 1M context; subagents get 200k, preserving rate-limit budget
- **Auto token refresh** — expired OAuth tokens are refreshed automatically; requests continue without interruption
- **Passthrough mode** — forward tool calls to the client instead of executing internally
- **Multimodal** — images, documents, and file attachments pass through to Claude
- **Multi-profile** — switch between Claude accounts instantly, no restart needed
- **Telemetry dashboard** — real-time performance metrics at `/telemetry`

## Multi-Profile Support

Ginny can route requests to different Claude accounts. Each **profile** is a named auth context — a separate Claude login with its own OAuth tokens. Switch between personal and work accounts, or share a single Ginny instance across teams.

### Adding profiles

```bash
# Add your personal account
ginny profile add personal
# → Opens browser for Claude login

# Add your work account (sign out of claude.ai first, then sign into the work account)
ginny profile add work
```

> **⚠ Important:** Claude's OAuth reuses your browser session. Before adding a second account, sign out of claude.ai and sign into the other account first.

### Switching profiles

```bash
# CLI (while proxy is running)
ginny profile switch work

# Per-request header (any agent)
curl -H "x-ginny-profile: work" ...
```

You can also switch profiles from the web UI at `http://127.0.0.1:3456/profiles` — a dropdown appears in the nav bar on all pages when profiles are configured.

### Profile commands

| Command | Description |
|---------|-------------|
| `ginny profile add <name>` | Add a profile and authenticate via browser |
| `ginny profile list` | List profiles and auth status |
| `ginny profile switch <name>` | Switch the active profile (requires running proxy) |
| `ginny profile login <name>` | Re-authenticate an expired profile |
| `ginny profile remove <name>` | Remove a profile and its credentials |

### How it works

Each profile stores its credentials in an isolated `CLAUDE_CONFIG_DIR` under `~/.config/ginny/profiles/<name>/`. When a request arrives, Ginny resolves the profile in priority order:

1. `x-ginny-profile` request header (per-request override)
2. Active profile (set via `ginny profile switch` or the web UI)
3. First configured profile

Session state is scoped per profile — switching accounts won't cross-contaminate conversation history.

### Environment variable configuration

For advanced setups (CI, Docker), profiles can also be provided via environment variable:

```bash
export GINNY_PROFILES='[{"id":"personal","claudeConfigDir":"/path/to/config1"},{"id":"work","claudeConfigDir":"/path/to/config2"}]'
export GINNY_DEFAULT_PROFILE=personal
ginny
```

When `GINNY_PROFILES` is set, it takes precedence over disk-configured profiles. When unset, Ginny auto-discovers profiles from `~/.config/ginny/profiles.json` on each request.

## Agent Setup

### OpenClaw

Configure your OpenClaw provider to point at Ginny in `~/.openclaw/openclaw.json`:

```json
{
  "models": {
    "mode": "merge",
    "providers": {
      "ant": {
        "baseUrl": "http://127.0.0.1:3456/v1",
        "api": "anthropic-messages",
        "apiKey": "blank",
        "models": [
          {
            "id": "claude-opus-4-6",
            "name": "Claude Opus 4.6 (Ginny)",
            "contextWindow": 1000000,
            "maxTokens": 4096,
            "input": ["text"],
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
            "reasoning": false
          }
        ]
      }
    }
  }
}
```

Then start Ginny with the OpenClaw adapter:

```bash
GINNY_DEFAULT_AGENT=openclaw ginny
```

OpenClaw is auto-detected via its User-Agent. If detection fails, the `GINNY_DEFAULT_AGENT` env var ensures the correct adapter is used. The OpenClaw adapter:

- Uses **passthrough mode** — tool calls are returned to OpenClaw for execution
- Sets CWD to `~/.openclaw/workspace`
- Handles large system prompts (>25K chars) by prepending to the user prompt

### OpenCode

**Step 1: Run `ginny setup` (required, one time)**

```bash
ginny setup
```

This adds the Ginny plugin to your OpenCode global config (`~/.config/opencode/opencode.json`). The plugin enables:

- **Session tracking** — reliable conversation continuity across requests
- **Safe model defaults** — Opus uses 1M context (included with Max subscription); Sonnet uses 200k to avoid Extra Usage charges ([details](#extended-context-billing))
- **Subagent model selection** — subagents automatically use `sonnet`/`opus` (200k), preserving rate-limit budget

If the plugin is missing, Ginny warns at startup and reports `"plugin": "not-configured"` in the health endpoint.

**Step 2: Start**

```bash
ANTHROPIC_API_KEY=x ANTHROPIC_BASE_URL=http://127.0.0.1:3456 opencode
```

Or set these in your shell profile so they're always active:

```bash
export ANTHROPIC_API_KEY=x
export ANTHROPIC_BASE_URL=http://127.0.0.1:3456
```

### Crush

Add a provider to `~/.config/crush/crush.json`:

```json
{
  "providers": {
    "@duchuyvp/ginny": {
      "id": "@duchuyvp/ginny",
      "name": "Ginny",
      "type": "anthropic",
      "base_url": "http://127.0.0.1:3456",
      "api_key": "dummy",
      "models": [
        { "id": "claude-sonnet-4-6", "name": "Claude Sonnet 4.6 (1M)", "context_window": 1000000, "default_max_tokens": 64000, "can_reason": true, "supports_attachments": true },
        { "id": "claude-opus-4-6",   "name": "Claude Opus 4.6 (1M)",   "context_window": 1000000, "default_max_tokens": 32768, "can_reason": true, "supports_attachments": true },
        { "id": "claude-haiku-4-5-20251001", "name": "Claude Haiku 4.5", "context_window": 200000, "default_max_tokens": 16384, "can_reason": true, "supports_attachments": true }
      ]
    }
  }
}
```

```bash
crush run --model ginny/claude-sonnet-4-6 "refactor this function"
crush --model ginny/claude-opus-4-6       # interactive TUI
```

Crush is automatically detected from its `Charm-Crush/` User-Agent — no plugin needed.

### Droid (Factory AI)

Add Ginny as a custom model provider in `~/.factory/settings.json`:

```json
{
  "customModels": [
    { "model": "claude-sonnet-4-6",       "name": "Sonnet 4.6 (Ginny)", "provider": "anthropic", "baseUrl": "http://127.0.0.1:3456", "apiKey": "x" },
    { "model": "claude-opus-4-6",         "name": "Opus 4.6 (Ginny)",   "provider": "anthropic", "baseUrl": "http://127.0.0.1:3456", "apiKey": "x" },
    { "model": "claude-haiku-4-5-20251001", "name": "Haiku 4.5 (Ginny)", "provider": "anthropic", "baseUrl": "http://127.0.0.1:3456", "apiKey": "x" }
  ]
}
```

Then pick any `custom:claude-*` model in the Droid TUI. No plugin needed — Droid is automatically detected.

### Cline

**1. Authenticate:**

```bash
cline auth --provider anthropic --apikey "dummy" --modelid "claude-sonnet-4-6"
```

**2. Set the proxy URL** in `~/.cline/data/globalState.json`:

```json
{
  "anthropicBaseUrl": "http://127.0.0.1:3456",
  "actModeApiProvider": "anthropic",
  "actModeApiModelId": "claude-sonnet-4-6"
}
```

**3. Run:**

```bash
cline --yolo "refactor the login function"
```

No plugin needed — Cline uses the standard Anthropic SDK.

### Aider

```bash
ANTHROPIC_API_KEY=x ANTHROPIC_BASE_URL=http://127.0.0.1:3456 \
  aider --model anthropic/claude-sonnet-4-5-20250929
```

> **Note:** `--no-stream` is incompatible due to a litellm parsing issue — use the default streaming mode.

### OpenAI-compatible tools (Open WebUI, Continue, etc.)

Ginny speaks the OpenAI protocol natively — no LiteLLM or translation proxy needed.

**`POST /v1/chat/completions`** — accepts OpenAI chat format, returns OpenAI completion format (streaming and non-streaming)

**`GET /v1/models`** — returns available Claude models in OpenAI format

Point any OpenAI-compatible tool at `http://127.0.0.1:3456` with any API key value:

```bash
# Open WebUI: set OpenAI API base to http://127.0.0.1:3456, API key to any value
# Continue: set apiBase to http://127.0.0.1:3456 with provider: openai
# Any OpenAI SDK: set base_url="http://127.0.0.1:3456", api_key="dummy"
```

> **Note:** Multi-turn conversations work by packing prior turns into the system prompt. Each request is a fresh SDK session — OpenAI clients replay full history themselves and don't use Ginny's session resumption.

### Pi

Pi uses the `@mariozechner/pi-ai` library which supports a configurable `baseUrl` on the model. Add a provider-level override in `~/.pi/agent/models.json`:

```json
{
  "anthropic": {
    "baseUrl": "http://127.0.0.1:3456"
  }
}
```

Then start Ginny with the pi default adapter:

```bash
GINNY_DEFAULT_AGENT=pi ginny
```

Pi mimics Claude Code's User-Agent, so automatic detection isn't possible. The `GINNY_DEFAULT_AGENT` env var tells Ginny to use the pi adapter for all unrecognized requests. If you run other agents alongside pi, use the `x-ginny-agent: pi` header instead (requires pi-ai support for custom headers).

### Any Anthropic-compatible tool

```bash
export ANTHROPIC_API_KEY=x
export ANTHROPIC_BASE_URL=http://127.0.0.1:3456
```

## Tested Agents

| Agent | Status | Notes |
|-------|--------|-------|
| [OpenClaw](https://openclaw.ai) | ✅ Verified | `GINNY_DEFAULT_AGENT=openclaw` — full tool passthrough, streaming, session management |
| [OpenCode](https://github.com/anomalyco/opencode) | ✅ Verified | Requires `ginny setup` — full tool support, session resume, streaming, subagents |
| [Droid (Factory AI)](https://factory.ai/product/ide) | ✅ Verified | BYOK config (see above) — full tool support, session resume, streaming |
| [Crush](https://github.com/charmbracelet/crush) | ✅ Verified | Provider config (see above) — full tool support, session resume, headless `crush run` |
| [Cline](https://github.com/cline/cline) | ✅ Verified | Config (see above) — full tool support, file read/write/edit, bash, session resume |
| [Aider](https://github.com/paul-gauthier/aider) | ✅ Verified | Env vars — file editing, streaming; `--no-stream` broken (litellm bug) |
| [Open WebUI](https://github.com/open-webui/open-webui) | ✅ Verified | OpenAI-compatible endpoints — set base URL to `http://127.0.0.1:3456` |
| [Pi](https://github.com/mariozechner/pi-coding-agent) | ✅ Verified | models.json config (see above) — requires `GINNY_DEFAULT_AGENT=pi` |
| [Continue](https://github.com/continuedev/continue) | 🔲 Untested | OpenAI-compatible endpoints should work — set `apiBase` to `http://127.0.0.1:3456` |

Tested an agent or built a plugin? [Open an issue](https://github.com/duchuyvp/ginny/issues) and we'll add it.

## Architecture

```
src/proxy/
├── server.ts              ← HTTP orchestration (routes, SSE streaming, concurrency)
├── adapter.ts             ← AgentAdapter interface
├── adapters/
│   ├── detect.ts          ← Agent detection from request headers
│   ├── opencode.ts        ← OpenCode adapter
│   ├── crush.ts           ← Crush adapter
│   ├── droid.ts           ← Droid adapter
│   ├── openclaw.ts        ← OpenClaw passthrough adapter
│   ├── pi.ts              ← Pi adapter
│   └── passthrough.ts     ← LiteLLM passthrough adapter
├── query.ts               ← SDK query options builder
├── errors.ts              ← Error classification
├── models.ts              ← Model mapping (sonnet/opus/haiku, agentMode)
├── tokenRefresh.ts        ← Cross-platform OAuth token refresh
├── openai.ts              ← OpenAI ↔ Anthropic format translation (pure)
├── setup.ts               ← OpenCode plugin configuration
├── session/
│   ├── lineage.ts         ← Per-message hashing, mutation classification (pure)
│   ├── fingerprint.ts     ← Conversation fingerprinting
│   └── cache.ts           ← LRU session caches
├── profiles.ts            ← Multi-profile: resolve, list, switch auth contexts
├── profileCli.ts          ← CLI commands for profile management
├── sessionStore.ts        ← Cross-proxy file-based session persistence
└── passthroughTools.ts    ← Tool forwarding mode
telemetry/
├── ...
├── profileBar.ts          ← Shared profile switcher bar
└── profilePage.ts         ← Profile management page
plugin/
└── ginny.ts            ← OpenCode plugin (session headers + agent mode)
```

### Session Management

Every incoming request is classified:

| Classification | What Happened | Action |
|---------------|---------------|--------|
| **Continuation** | New messages appended | Resume SDK session |
| **Compaction** | Agent summarized old messages | Resume (suffix preserved) |
| **Undo** | User rolled back messages | Fork at rollback point |
| **Diverged** | Completely different conversation | Start fresh |

Sessions are stored in-memory (LRU) and persisted to `~/.cache/ginny/sessions.json` for cross-proxy resume.

### Agent Detection

Agents are identified from request headers automatically:

| Signal | Adapter |
|---|---|
| `x-ginny-agent` header | Explicit override (any adapter) |
| `openclaw/` User-Agent | OpenClaw |
| `Charm-Crush/` User-Agent | Crush |
| `factory-cli/` User-Agent | Droid |
| `litellm/` UA or `x-litellm-*` headers | LiteLLM passthrough |
| *(anything else)* | `GINNY_DEFAULT_AGENT` env var, or OpenCode |

### Adding a New Agent

Implement the `AgentAdapter` interface in `src/proxy/adapters/`. See [`adapters/opencode.ts`](src/proxy/adapters/opencode.ts) for a reference.

## Configuration

| Variable | Alias | Default | Description |
|----------|-------|---------|-------------|
| `GINNY_PORT` | `CLAUDE_PROXY_PORT` | `3456` | Port to listen on |
| `GINNY_HOST` | `CLAUDE_PROXY_HOST` | `127.0.0.1` | Host to bind to |
| `GINNY_PASSTHROUGH` | `CLAUDE_PROXY_PASSTHROUGH` | unset | Forward tool calls to client instead of executing |
| `GINNY_MAX_CONCURRENT` | `CLAUDE_PROXY_MAX_CONCURRENT` | `10` | Maximum concurrent SDK sessions |
| `GINNY_MAX_SESSIONS` | `CLAUDE_PROXY_MAX_SESSIONS` | `1000` | In-memory LRU session cache size |
| `GINNY_MAX_STORED_SESSIONS` | `CLAUDE_PROXY_MAX_STORED_SESSIONS` | `10000` | File-based session store capacity |
| `GINNY_WORKDIR` | `CLAUDE_PROXY_WORKDIR` | `cwd()` | Default working directory for SDK |
| `GINNY_IDLE_TIMEOUT_SECONDS` | `CLAUDE_PROXY_IDLE_TIMEOUT_SECONDS` | `120` | HTTP keep-alive timeout |
| `GINNY_TELEMETRY_SIZE` | `CLAUDE_PROXY_TELEMETRY_SIZE` | `1000` | Telemetry ring buffer size |
| `GINNY_NO_FILE_CHANGES` | `CLAUDE_PROXY_NO_FILE_CHANGES` | unset | Disable "Files changed" summary in responses |
| `GINNY_SONNET_MODEL` | `CLAUDE_PROXY_SONNET_MODEL` | `sonnet` | Sonnet context tier: `sonnet` (200k, default) or `sonnet[1m]` (1M, requires Extra Usage†) |
| `GINNY_DEFAULT_AGENT` | — | `opencode` | Default adapter for unrecognized agents: `opencode`, `pi`, `crush`, `droid`, `passthrough`. Requires restart. |
| `GINNY_PROFILES` | — | unset | JSON array of profile configs (overrides disk discovery). See [Multi-Profile Support](#multi-profile-support). |
| `GINNY_DEFAULT_PROFILE` | — | *(first profile)* | Default profile ID when no header is sent |

†Sonnet 1M requires Extra Usage on all plans including Max ([docs](https://code.claude.com/docs/en/model-config#extended-context)). Opus 1M is included with Max/Team/Enterprise at no extra cost.

## Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | Landing page |
| `POST /v1/messages` | Anthropic Messages API |
| `POST /messages` | Alias for `/v1/messages` |
| `POST /v1/chat/completions` | OpenAI-compatible chat completions |
| `GET /v1/models` | OpenAI-compatible model list |
| `GET /health` | Auth status, mode, plugin status |
| `POST /auth/refresh` | Manually refresh the OAuth token |
| `GET /telemetry` | Performance dashboard |
| `GET /telemetry/requests` | Recent request metrics (JSON) |
| `GET /telemetry/summary` | Aggregate statistics (JSON) |
| `GET /telemetry/logs` | Diagnostic logs (JSON) |
| `GET /profiles` | Profile management page |
| `GET /profiles/list` | List profiles with auth status (JSON) |
| `POST /profiles/active` | Switch the active profile |

Health response example:

```json
{
  "status": "healthy",
  "auth": { "loggedIn": true, "email": "you@example.com", "subscriptionType": "max" },
  "mode": "internal",
  "plugin": { "opencode": "configured" }
}
```

`plugin.opencode` is `"configured"` when `ginny setup` has been run, `"not-configured"` otherwise.

## CLI Commands

| Command | Description |
|---------|-------------|
| `ginny` | Start the proxy server |
| `ginny setup` | Configure the OpenCode plugin in `~/.config/opencode/opencode.json` |
| `ginny profile add <name>` | Add a profile and authenticate via browser |
| `ginny profile list` | List all profiles and their auth status |
| `ginny profile switch <name>` | Switch the active profile (requires running proxy) |
| `ginny profile login <name>` | Re-authenticate an expired profile |
| `ginny profile remove <name>` | Remove a profile and its credentials |
| `ginny refresh-token` | Manually refresh the Claude OAuth token (exits 0/1) |

## Programmatic API

```typescript
import { startProxyServer } from "@duchuyvp/ginny"

const instance = await startProxyServer({
  port: 3456,
  host: "127.0.0.1",
  silent: true,
})

// instance.server — underlying http.Server
await instance.close()
```

## Docker

```bash
docker run -v ~/.claude:/home/claude/.claude -p 3456:3456 ginny
```

## Testing

```bash
npm test       # unit + integration tests
npm run build  # build with bun + tsc
```

| Tier | What | Speed |
|------|------|-------|
| Unit | Pure functions, no mocks | Fast |
| Integration | HTTP layer with mocked SDK | Fast |
| E2E | Real proxy + real Claude Max ([`E2E.md`](E2E.md)) | Manual |

## FAQ

**Is this allowed by Anthropic's terms?**
Ginny uses the official Claude Code SDK — the same SDK Anthropic publishes and documents for programmatic access. It does not intercept credentials, modify binaries, or bypass any authentication. All requests flow through the SDK's own authentication and rate-limiting mechanisms.

**How is this different from using an API key?**
API keys provide direct API access billed per token. Claude Max includes programmatic access through the Claude Code SDK. Ginny translates SDK responses into the standard Anthropic API format, allowing compatible tools to connect through Claude Code.

**What happens if my OAuth token expires?**
Tokens expire roughly every 8 hours. Ginny detects the expiry, refreshes the token automatically, and retries the request — so requests continue transparently. If the refresh fails (e.g. the refresh token has expired after weeks of inactivity), Ginny returns a clear error telling you to run `claude login`.

**Can I trigger a token refresh manually?**

```bash
# CLI — works whether the proxy is running or not
ginny refresh-token

# HTTP — while the proxy is running
curl -X POST http://127.0.0.1:3456/auth/refresh
```

**I'm hitting rate limits on 1M context. What do I do?**
Ginny defaults Sonnet to 200k context because Sonnet 1M is always billed as Extra Usage on Max plans — even when regular usage isn't exhausted. This is [Anthropic's intended billing model](https://code.claude.com/docs/en/model-config#extended-context), not a bug. Set `GINNY_SONNET_MODEL=sonnet[1m]` to opt in if you have Extra Usage enabled and understand the billing implications. Opus defaults to 1M context, which is included with Max/Team/Enterprise subscriptions at no extra cost. Note: there is a [known upstream bug](https://github.com/anthropics/claude-code/issues/39841) where Claude Code incorrectly gates Opus 1M behind Extra Usage on Max — this is Anthropic's to fix.

**Why does the health endpoint show `"plugin": "not-configured"`?**
You haven't run `ginny setup`. Without the plugin, OpenCode requests won't have session tracking or subagent model selection. Run `ginny setup` and restart OpenCode.

## Contributing

Issues and PRs welcome. Join the [Discord](https://discord.gg/7vNVFYBz) to discuss ideas before opening issues. See [`ARCHITECTURE.md`](ARCHITECTURE.md) for module structure and dependency rules, [`CLAUDE.md`](CLAUDE.md) for coding guidelines, and [`E2E.md`](E2E.md) for end-to-end test procedures.

## License

MIT
