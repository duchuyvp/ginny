/**
 * Persistent server settings.
 *
 * Stored in ~/.config/ginny/settings.json. Survives proxy restarts.
 * Shared between CLI, UI, and API — browser localStorage is only used
 * for client-only preferences (theme, collapsed sections, etc.).
 *
 * This is a leaf module — no imports from server.ts or session/.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { join, dirname } from "node:path"
import { homedir } from "node:os"

const SETTINGS_FILE = join(homedir(), ".config", "ginny", "settings.json")

export interface GinnySettings {
  /** Last active profile ID — restored on proxy startup */
  activeProfile?: string
}

/** Read settings from disk. Returns empty object if file doesn't exist or is invalid. */
export function loadSettings(): GinnySettings {
  try {
    if (!existsSync(SETTINGS_FILE)) return {}
    return JSON.parse(readFileSync(SETTINGS_FILE, "utf-8"))
  } catch {
    return {}
  }
}

/** Write settings to disk. Merges with existing settings (doesn't clobber unknown keys). */
export function saveSettings(updates: Partial<GinnySettings>): void {
  const current = loadSettings()
  const merged = { ...current, ...updates }
  try {
    mkdirSync(dirname(SETTINGS_FILE), { recursive: true })
    writeFileSync(SETTINGS_FILE, JSON.stringify(merged, null, 2) + "\n", { mode: 0o600 })
  } catch (err) {
    console.warn(`[ginny] Failed to write ${SETTINGS_FILE}: ${err instanceof Error ? err.message : err}`)
  }
}

/** Get a single setting value */
export function getSetting<K extends keyof GinnySettings>(key: K): GinnySettings[K] {
  return loadSettings()[key]
}

/** Set a single setting value and persist */
export function setSetting<K extends keyof GinnySettings>(key: K, value: GinnySettings[K]): void {
  saveSettings({ [key]: value })
}
