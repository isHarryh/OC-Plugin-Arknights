/*
 * Reads and patches the user's tui.json to apply attention sound mappings.
 * Supports two config scopes:
 *   - "user":    ~/.config/opencode/tui.json (default)
 *   - "project": .opencode/tui.json (project-local, requires restart)
 *
 * OpenCode reads tui.json at startup; changes require a restart to take effect.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join } from "node:path"
import { pathToFileURL } from "node:url"
import { attentionEvents, getSoundPath, type SoundMappings } from "./sound-pack"

export type ConfigScope = "user" | "project"

export function getConfigPath(scope: ConfigScope): string {
  const env = process.env.OPENCODE_TUI_CONFIG
  if (env) return env
  if (scope === "user") {
    return join(homedir(), ".config", "opencode", "tui.json")
  }
  return join(process.cwd(), ".opencode", "tui.json")
}

function readOrCreateConfig(path: string): Record<string, unknown> {
  if (existsSync(path)) {
    return JSON.parse(readFileSync(path, "utf-8"))
  }
  mkdirSync(dirname(path), { recursive: true })
  return {}
}

function writeConfig(path: string, config: Record<string, unknown>): void {
  writeFileSync(path, JSON.stringify(config, null, 2) + "\n", "utf-8")
}

export interface PatchResult {
  success: boolean
  path: string
  scope: ConfigScope
  message: string
}

export interface SoundConfig {
  enabled: boolean
  override: boolean
  mappings: SoundMappings
}

export function applySoundConfig(
  config: SoundConfig,
  scope: ConfigScope,
): PatchResult {
  const configPath = getConfigPath(scope)

  try {
    const stored = readOrCreateConfig(configPath)

    const attn: Record<string, unknown> = {
      ...(typeof stored.attention === "object" && stored.attention !== null
        ? (stored.attention as Record<string, unknown>)
        : {}),
    }

    if (!config.enabled) {
      attn.sound = false
    } else {
      attn.enabled = true
      attn.sound = true
      if (config.override) {
        const sounds: Record<string, string> = {}
        for (const event of attentionEvents) {
          const file = config.mappings[event]
          if (!file) continue
          sounds[event] = pathToFileURL(getSoundPath(file)).href
        }
        attn.sounds = sounds
      } else {
        delete attn.sounds
      }
    }

    stored.attention = attn
    writeConfig(configPath, stored)

    return {
      success: true,
      path: configPath,
      scope,
      message: "Updated! Restart OpenCode for changes to take effect.",
    }
  } catch (err) {
    return {
      success: false,
      path: configPath,
      scope,
      message: `Failed to update tui.json: ${String(err)}`,
    }
  }
}
