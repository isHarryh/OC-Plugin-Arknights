// @ts-nocheck
/** @jsxImportSource @opentui/solid */
import { useTerminalDimensions } from "@opentui/solid"
import type { TuiPlugin, TuiPluginApi, TuiPluginModule, TuiThemeCurrent } from "@opencode-ai/plugin/tui"
import { createMemo, createSignal, Show } from "solid-js"
import { displayNames, getLogo, logoIds, type LogoSet, type LogoSize } from "./logos"
import { SettingsDialog } from "./settings-dialog"
import {
  defaultMappings,
  validateMappings,
  type SoundMappings,
} from "./sound-pack"
import { applySoundConfig, getConfigPath, type ConfigScope, type SoundConfig } from "./config-patch"

const id = "arknights"

const command = {
  settings: "arknights.settings",
  applyAudioConfig: "arknights.apply-audio-config",
}

type LogoCfg = {
  enabled: boolean
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

const cfg = (opts: Record<string, unknown> | undefined): Cfg => {
  const logo = rec(opts?.logo)
  const soundPack = rec(opts?.sound_pack)
  return {
    enabled: bool(opts?.enabled, true),
    logo: {
      enabled: bool(logo?.enabled, true),
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

const settingKey = {
  logoEnabled: `${id}.logo.enabled`,
  logoMode: `${id}.logo.mode`,
  logoSelected: `${id}.logo.selected`,
  soundPackEnabled: `${id}.sound_pack.enabled`,
  soundPackOverride: `${id}.sound_pack.override`,
  soundPackMappings: `${id}.sound_pack.mappings`,
} as const

type LogoField = "enabled" | "mode" | "selected"

const logoFieldToKV = (field: LogoField): string => {
  switch (field) {
    case "enabled":
      return settingKey.logoEnabled
    case "mode":
      return settingKey.logoMode
    case "selected":
      return settingKey.logoSelected
  }
}

const readSoundMappings = (api: TuiPluginApi, fallback: SoundMappings): SoundMappings => {
  const raw = api.kv.get(settingKey.soundPackMappings, null)
  if (typeof raw !== "string") return fallback
  try {
    const kvMappings = validateMappings(JSON.parse(raw))
    return Object.keys(kvMappings).length > 0 ? kvMappings : fallback
  } catch {
    return fallback
  }
}

const withKV = (api: TuiPluginApi, value: Cfg): Cfg => {
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

const pickRandomLogo = (defaultId: string): string => {
  const idx = Math.floor(Math.random() * logoIds.length)
  return logoIds[idx] ?? defaultId
}

const sizes: LogoSize[] = ["sm", "md", "lg"]

const lineCount = (str: string) => str.split("\n").length
const lineWidth = (str: string) => Math.max(...str.split("\n").map((l) => l.length))

function logoLines(logo: string): string[] {
  return logo.split("\n")
}

const Home = (props: { theme: TuiThemeCurrent; logos: LogoSet }) => {
  const dim = useTerminalDimensions()
  const [gap, setGap] = createSignal({ width: 0, height: 0 })

  const current = createMemo(() => {
    const term = dim()
    const chrome = gap()
    const h = Math.max(0, term.height - chrome.height)
    const w = Math.max(0, term.width - chrome.width)

    for (let i = sizes.length - 1; i >= 0; i--) {
      const size = sizes[i]
      const logo = props.logos[size]
      const lc = lineCount(logo)
      const lw = lineWidth(logo)
      if (h >= lc && w >= lw) return { size, lines: logoLines(logo), isDefault: false }
    }

    return { size: "sm" as LogoSize, lines: logoLines(props.logos.sm), isDefault: true }
  })

  return (
    <box
      onSizeChange={function () {
        const term = dim()
        const own = { width: this.width, height: this.height }
        const next = {
          width: Math.max(0, term.width - own.width),
          height: Math.max(0, term.height - own.height),
        }
        setGap((prev) => ({
          width: prev.width > 0 ? Math.min(prev.width, next.width) : next.width,
          height: prev.height > 0 ? Math.min(prev.height, next.height) : next.height,
        }))
      }}
      flexDirection="column"
      alignItems="center"
    >
      {(() => {
        const { lines, isDefault } = current()
        return lines.map((line, i) => (
          <text
            fg={
              isDefault ? (i < 2 ? props.theme.textMuted : props.theme.text) : props.theme.primary
            }
          >
            {line}
          </text>
        ))
      })()}
    </box>
  )
}

const tui: TuiPlugin = async (api, options) => {
  const boot = cfg(rec(options))
  if (!boot.enabled) return

  const [value, setValue] = createSignal(withKV(api, boot))

  const activeLogoId = createMemo(() => {
    const state = value()
    if (state.logo.mode === "fixed") return state.logo.selected
    return pickRandomLogo("rhodes")
  })

  const activeLogo = createMemo(() => {
    return getLogo(activeLogoId()) ?? getLogo("rhodes")
  })

  const updateLogo = (field: LogoField, next: unknown) => {
    const prev = value()
    const prevLogo = prev.logo
    if (prevLogo[field] === next) return
    const newLogo = { ...prevLogo, [field]: next }
    setValue({ ...prev, logo: newLogo })
    api.kv.set(logoFieldToKV(field), newLogo[field])
  }

  const updateSoundSettings = (next: SoundConfig) => {
    const prev = value()
    let mappings = next.mappings
    if (next.override) {
      if (!prev.sound_pack.override) {
        mappings = readSoundMappings(api, next.mappings)
      }
      api.kv.set(settingKey.soundPackMappings, JSON.stringify(mappings))
    }
    setValue({ ...prev, sound_pack: { ...prev.sound_pack, ...next, mappings } })
    api.kv.set(settingKey.soundPackEnabled, next.enabled)
    api.kv.set(settingKey.soundPackOverride, next.override)
  }

  const showSettings = () => {
    api.ui.dialog.replace(() => (
      <SettingsDialog
        api={api}
        value={value}
        update={updateLogo}
        logoIds={logoIds}
        displayNames={displayNames}
        soundSettings={() => ({
          enabled: value().sound_pack.enabled,
          override: value().sound_pack.override,
          mappings: value().sound_pack.mappings,
        })}
        onSoundSettingsChange={updateSoundSettings}
      />
    ))
  }

  const showApplyConfig = () => {
    const current = value()
    const theme = api.theme.current
    const DialogSelect = api.ui.DialogSelect

    api.ui.dialog.replace(() => (
      <DialogSelect
        title="Apply Sound Config"
        placeholder="Choose scope"
        options={[
          { title: "User config", value: "user", footer: getConfigPath("user") },
          { title: "Project config", value: "project", footer: getConfigPath("project") },
        ]}
        current={null}
        onSelect={(item) => {
          const scope = item.value as ConfigScope
          const result = applySoundConfig(
            {
              enabled: current.sound_pack.enabled,
              override: current.sound_pack.override,
              mappings: current.sound_pack.mappings,
            },
            scope,
          )
          api.ui.dialog.replace(() => (
            <box flexDirection="column" padding={1}>
              <text fg={result.success ? theme.primary : theme.error}>
                {result.success ? "Success" : "Error"}
              </text>
              <box height={1} />
              <text fg={theme.text}>{result.message}</text>
              {result.success && (
                <>
                  <box height={1} />
                  <text fg={theme.textMuted}>Scope: {result.scope} ({result.path})</text>
                </>
              )}
            </box>
          ))
        }}
      />
    ))
  }

  api.keymap.registerLayer({
    commands: [
      {
        name: command.settings,
        title: "Arknights: Settings",
        category: "System",
        namespace: "palette",
        run() {
          showSettings()
        },
      },
      {
        name: command.applyAudioConfig,
        title: "Arknights: Apply Sound Config",
        category: "System",
        namespace: "palette",
        run() {
          showApplyConfig()
        },
      },
    ],
  })

  api.lifecycle.onDispose(async () => {})

  api.slots.register({
    slots: {
      home_logo(ctx) {
        return (
          <Show when={value().logo.enabled}>
            <Home theme={ctx.theme.current} logos={activeLogo()} />
          </Show>
        )
      },
    },
  })
}

const plugin: TuiPluginModule & { id: string } = {
  id,
  tui,
}

export default plugin
