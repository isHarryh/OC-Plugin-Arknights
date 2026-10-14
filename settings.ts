import { logoIds } from "./logos"
import { defaultMappings, validateMappings, type SoundMappings } from "./sound-pack"

export const id = "oc-plugin-arknights"

export const command = {
  logoSettings: "arknights.logo-settings",
  soundSettings: "arknights.sound-settings",
  applyAudioConfig: "arknights.apply-audio-config",
}

export const group = "Arknights"

export type LogoPadding = "large" | "small"
export type LogoMode = "fixed" | "random"

export interface LogoSettings {
  enabled: boolean
  padding: LogoPadding
  mode: LogoMode
  selected: string
}

export interface SoundPackSettings {
  enabled: boolean
  override: boolean
  mappings: SoundMappings
}

/** Everything the settings dialog can change, persisted as a single JSON object. */
export interface Settings {
  logo: LogoSettings
  sound_pack: SoundPackSettings
}

/** Plugin options resolved into dialog defaults. */
export interface Boot extends Settings {
  enabled: boolean
}

const rec = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return
  return Object.fromEntries(Object.entries(value as Record<string, unknown>))
}

const bool = (value: unknown, fallback: boolean) => {
  if (typeof value !== "boolean") return fallback
  return value
}

const pickStr = <T extends string>(value: unknown, fallback: T, valid: readonly T[]): T => {
  if (typeof value !== "string") return fallback
  if (!valid.includes(value as T)) return fallback
  return value as T
}

export const cfg = (options: unknown): Boot => {
  const opts = rec(options)
  const logo = rec(opts?.logo)
  const soundPack = rec(opts?.sound_pack)
  return {
    enabled: bool(opts?.enabled, true),
    logo: {
      enabled: bool(logo?.enabled, true),
      padding: pickStr(logo?.padding, "large", ["large", "small"] as const),
      mode: pickStr(logo?.mode, "random", ["fixed", "random"] as const),
      selected: pickStr(logo?.selected, "rhodes", logoIds),
    },
    sound_pack: {
      enabled: bool(soundPack?.enabled, true),
      override: bool(soundPack?.override, true),
      mappings: { ...defaultMappings },
    },
  }
}

/** Validates persisted state against the boot defaults. */
export const sanitize = (value: unknown, fallback: Settings): Settings => {
  const stored = rec(value)
  const logo = rec(stored?.logo)
  const soundPack = rec(stored?.sound_pack)
  const mappings = validateMappings(rec(soundPack?.mappings) ?? {})
  return {
    logo: {
      enabled: bool(logo?.enabled, fallback.logo.enabled),
      padding: pickStr(logo?.padding, fallback.logo.padding, ["large", "small"] as const),
      mode: pickStr(logo?.mode, fallback.logo.mode, ["fixed", "random"] as const),
      selected: pickStr(logo?.selected, fallback.logo.selected, logoIds),
    },
    sound_pack: {
      enabled: bool(soundPack?.enabled, fallback.sound_pack.enabled),
      override: bool(soundPack?.override, fallback.sound_pack.override),
      mappings: Object.keys(mappings).length > 0 ? mappings : fallback.sound_pack.mappings,
    },
  }
}

export const pickRandomLogo = (defaultId: string): string => {
  const idx = Math.floor(Math.random() * logoIds.length)
  return logoIds[idx] ?? defaultId
}
