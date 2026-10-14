/*
 * Patches the global cli.json so the TUI plays the sound pack's attention sounds.
 *
 * OpenCode V2 only reads the CLI config from the global config directory
 * (`$OPENCODE_CONFIG_DIR` or `$XDG_CONFIG_HOME/opencode` or `~/.config/opencode`),
 * so there is no project scope to write to.
 *
 * `attention.sounds` values must be plain filesystem paths: the TUI loads them
 * with `fs.readFile`, so file URLs fail and fall back to the built-in sounds.
 * The running TUI watches the config directory and reloads on change.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join } from "node:path"
import { attentionEvents, getSoundPath, type SoundMappings } from "./sound-pack"

const SCHEMA_URL = "https://opencode.ai/v2/cli.json"

export interface PatchResult {
  success: boolean
  path: string
  message: string
}

export interface SoundConfig {
  enabled: boolean
  override: boolean
  mappings: SoundMappings
}

export function getConfigPath(): string {
  const configDir = process.env.OPENCODE_CONFIG_DIR
  if (configDir) return join(configDir, "cli.json")
  const base = process.env.XDG_CONFIG_HOME || join(homedir(), ".config")
  return join(base, "opencode", "cli.json")
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function readOrCreateConfig(path: string): Record<string, unknown> {
  if (existsSync(path)) {
    const parsed: unknown = JSON.parse(readFileSync(path, "utf-8"))
    return isRecord(parsed) ? parsed : {}
  }
  mkdirSync(dirname(path), { recursive: true })
  return { $schema: SCHEMA_URL }
}

function writeConfig(path: string, config: Record<string, unknown>): void {
  writeFileSync(path, JSON.stringify(config, null, 2) + "\n", "utf-8")
}

export function applySoundConfig(config: SoundConfig): PatchResult {
  const configPath = getConfigPath()

  try {
    const stored = readOrCreateConfig(configPath)

    const attn: Record<string, unknown> = {
      ...(isRecord(stored.attention) ? stored.attention : {}),
    }

    if (!config.enabled) {
      attn.sound = false
    } else {
      attn.sound = true
      if (config.override) {
        const sounds: Record<string, string> = {}
        for (const event of attentionEvents) {
          const file = config.mappings[event]
          if (!file) continue
          sounds[event] = getSoundPath(file)
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
      message: "Updated! The sound settings apply immediately.",
    }
  } catch (err) {
    return {
      success: false,
      path: configPath,
      message: `Failed to update cli.json: ${String(err)}`,
    }
  }
}
