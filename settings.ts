import { logoIds } from "./logos"
import { defaultMappings, validateMappings, type SoundMappings } from "./sound-pack"
import type { TuiPluginApi } from "@opencode-ai/plugin/tui"

export const id = "arknights"

export const command = {
  settings: "arknights.settings",
  applyAudioConfig: "arknights.apply-audio-config",
}

type LogoCfg = {
  enabled: boolean
  padding: "large" | "small"
  mode: "fixed" | "random"
  selected: string
}

type SoundPackCfg = {
  enabled: boolean
  override: boolean
  mappings: SoundMappings
}

type Cfg = {
  enabled: boolean
  logo: LogoCfg
  sound_pack: SoundPackCfg
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

export const cfg = (options: unknown): Cfg => {
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

export const settingKey = {
  logoEnabled: `${id}.logo.enabled`,
  logoPadding: `${id}.logo.padding`,
  logoMode: `${id}.logo.mode`,
  logoSelected: `${id}.logo.selected`,
  soundPackEnabled: `${id}.sound_pack.enabled`,
  soundPackOverride: `${id}.sound_pack.override`,
  soundPackMappings: `${id}.sound_pack.mappings`,
} as const

export type LogoField = "enabled" | "padding" | "mode" | "selected"

export const logoFieldToKV = (field: LogoField): string => {
  switch (field) {
    case "enabled":
      return settingKey.logoEnabled
    case "padding":
      return settingKey.logoPadding
    case "mode":
      return settingKey.logoMode
    case "selected":
      return settingKey.logoSelected
  }
}

export const readSoundMappings = (api: TuiPluginApi, fallback: SoundMappings): SoundMappings => {
  const raw = api.kv.get(settingKey.soundPackMappings, null)
  if (typeof raw !== "string") return fallback
  try {
    const kvMappings = validateMappings(JSON.parse(raw))
    return Object.keys(kvMappings).length > 0 ? kvMappings : fallback
  } catch {
    return fallback
  }
}

export const withKV = (api: TuiPluginApi, value: Cfg): Cfg => {
  const soundOverride = bool(
    api.kv.get(settingKey.soundPackOverride, value.sound_pack.override),
    value.sound_pack.override,
  )

  const mappings = soundOverride
    ? readSoundMappings(api, value.sound_pack.mappings)
    : value.sound_pack.mappings

  return {
    ...value,
    logo: {
      enabled: bool(api.kv.get(settingKey.logoEnabled, value.logo.enabled), value.logo.enabled),
      padding: pickStr(
        api.kv.get(settingKey.logoPadding, value.logo.padding),
        value.logo.padding,
        ["large", "small"] as const,
      ),
      mode: pickStr(api.kv.get(settingKey.logoMode, value.logo.mode), value.logo.mode, ["fixed", "random"] as const),
      selected: pickStr(
        api.kv.get(settingKey.logoSelected, value.logo.selected),
        value.logo.selected,
        logoIds,
      ),
    },
    sound_pack: {
      enabled: bool(
        api.kv.get(settingKey.soundPackEnabled, value.sound_pack.enabled),
        value.sound_pack.enabled,
      ),
      override: soundOverride,
      mappings,
    },
  }
}

export const pickRandomLogo = (defaultId: string): string => {
  const idx = Math.floor(Math.random() * logoIds.length)
  return logoIds[idx] ?? defaultId
}
