# Migrating from opencode-claude-max-proxy to ginny

This guide covers everything you need to update when upgrading from `opencode-claude-max-proxy` to `ginny` (Ginny).

> **The old package continues to work.** Your existing install won't break. This migration is for when you're ready to switch to the new name.

## Quick Checklist

- [ ] Install the new package: `npm install -g ginny`
- [ ] Uninstall the old package: `npm uninstall -g opencode-claude-max-proxy`
- [ ] Update LaunchD plist (if using background service)
- [ ] Update environment variables (old `CLAUDE_PROXY_*` still work, but `GINNY_*` is preferred)
- [ ] Update import paths in any plugins (if using the programmatic API)
- [ ] Update agent configs (Crush, Droid, Cline) — only if you referenced the old cache path
- [ ] Sessions migrate automatically — no action needed

---

## 1. Install the New Package

```bash
# Install new
npm install -g ginny

# Verify
ginny --version

# Remove old (when ready)
npm uninstall -g opencode-claude-max-proxy
```

The `ginny` CLI command hasn't changed — it was already the primary binary name.

## 2. Session Data Migration

**Sessions migrate automatically.** On first startup, Ginny checks for the old cache directory (`~/.cache/opencode-claude-max-proxy/`) and creates a symlink to the new location (`~/.cache/ginny/`). Your existing sessions, conversation history, and SDK session IDs are preserved.

If you want to verify:
```bash
ls -la ~/.cache/ginny
# Should exist (symlink or directory)
```

## 3. Environment Variables

All `CLAUDE_PROXY_*` environment variables continue to work. New `GINNY_*` equivalents are available and take precedence if both are set.

| Old (still works) | New (preferred) | What it does |
|---|---|---|
| `CLAUDE_PROXY_PORT` | `GINNY_PORT` | Port to listen on (default: 3456) |
| `CLAUDE_PROXY_HOST` | `GINNY_HOST` | Host to bind to (default: 127.0.0.1) |
| `CLAUDE_PROXY_DEBUG` | `GINNY_DEBUG` | Enable debug logging |
| `CLAUDE_PROXY_PASSTHROUGH` | `GINNY_PASSTHROUGH` | Forward tool calls to client |
| `CLAUDE_PROXY_WORKDIR` | `GINNY_WORKDIR` | Default working directory |
| `CLAUDE_PROXY_MAX_CONCURRENT` | `GINNY_MAX_CONCURRENT` | Max concurrent SDK sessions |
| `CLAUDE_PROXY_MAX_SESSIONS` | `GINNY_MAX_SESSIONS` | In-memory session cache size |
| `CLAUDE_PROXY_MAX_STORED_SESSIONS` | `GINNY_MAX_STORED_SESSIONS` | File-based session store cap |
| `CLAUDE_PROXY_SESSION_DIR` | `GINNY_SESSION_DIR` | Session store directory |
| `CLAUDE_PROXY_SONNET_MODEL` | `GINNY_SONNET_MODEL` | Override sonnet model tier |
| `CLAUDE_PROXY_TELEMETRY_SIZE` | `GINNY_TELEMETRY_SIZE` | Telemetry ring buffer size |

**You do NOT need to update all at once.** The old names work indefinitely.

## 4. LaunchD Service (macOS Background Service)

If you run Ginny as a launchd background service, update your plist:

```bash
# 1. Unload old service
launchctl unload ~/Library/LaunchAgents/com.rynfar.claude-max-proxy.plist

# 2. Update the plist file:
#    - Change Label to your preferred name
#    - Update ProgramArguments if the install path changed
#    - Optionally rename CLAUDE_PROXY_* to GINNY_* env vars
#    - Update StandardOutPath/StandardErrorPath if desired

# 3. Reload
launchctl load ~/Library/LaunchAgents/com.rynfar.claude-max-proxy.plist
```

The binary path shouldn't change if you installed globally — `ginny` was already the primary command.

## 5. Programmatic API (Plugin Authors)

If you import from the package in your code:

```typescript
// Old
import { startProxyServer } from "opencode-claude-max-proxy"

// New
import { startProxyServer } from "ginny"
```

The API surface is identical — same types, same functions, same behavior. Only the package name changed.

**Transition period:** The final version of `opencode-claude-max-proxy` re-exports everything from `ginny`, so existing plugins continue to work without changes. Update at your convenience.

## 6. Agent Configurations

### OpenCode
No changes needed. OpenCode connects via `ANTHROPIC_BASE_URL` which points at `http://127.0.0.1:3456` — this hasn't changed.

### Crush
No changes needed. The `base_url` in `~/.config/crush/crush.json` points at `http://127.0.0.1:3456` — this hasn't changed.

### Droid
No changes needed. The `baseUrl` in `~/.factory/settings.json` points at `http://127.0.0.1:3456` — this hasn't changed.

### Cline
No changes needed. The `anthropicBaseUrl` in `~/.cline/data/globalState.json` points at `http://127.0.0.1:3456` — this hasn't changed.

## 7. Docker

```bash
# Old
docker pull opencode-claude-max-proxy

# New
docker pull ginny
```

The `docker-compose.yml` image name changes from `claude-max-proxy` to `ginny`.

## 8. GitHub Repository

The repository URL will change from:
```
https://github.com/rynfar/opencode-claude-max-proxy
```
to:
```
https://github.com/rynfar/ginny
```

GitHub automatically redirects the old URL, so existing links, bookmarks, and git remotes continue to work. To update your local clone:

```bash
cd ~/repos/opencode-claude-max-proxy
git remote set-url origin https://github.com/rynfar/ginny.git
cd ..
mv opencode-claude-max-proxy ginny  # optional: rename local directory
```

---

## What Stays the Same

- **Port 3456** — default port unchanged
- **`ginny` CLI command** — already the primary binary, unchanged
- **All API endpoints** — `/v1/messages`, `/health`, `/telemetry` unchanged
- **`x-opencode-session` header** — still supported (OpenCode adapter)
- **Session file format** — unchanged, auto-migrated
- **Agent detection** — same User-Agent matching rules
- **All adapters** — OpenCode, Droid, Crush, Cline all work identically

## Timeline

1. **Now:** `ginny` published alongside `opencode-claude-max-proxy`
2. **30 days:** `opencode-claude-max-proxy` marked as deprecated on npm (still installable)
3. **90 days:** Consider removing old package (or keep indefinitely as a redirect)
