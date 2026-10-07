// @ts-nocheck
/** @jsxImportSource @opentui/solid */
import { useKeyboard, useTerminalDimensions } from "@opentui/solid"
import type { TuiPlugin, TuiPluginApi, TuiPluginModule, TuiThemeCurrent } from "@opencode-ai/plugin/tui"
import { createMemo, createSignal, Show } from "solid-js"
import { displayNames, getLogo, logoIds, type LogoSet, type LogoSize } from "./logos"
import {
  cfg,
  command,
  id,
  logoFieldToKV,
  pickRandomLogo,
  readSoundMappings,
  settingKey,
  withKV,
  type LogoField,
} from "./settings"
import {
  currentLabel,
  getRows,
  modeLabel,
  status,
  type LogoSettings,
  type SettingField,
  type SettingRow,
} from "./settings-rows"
import { getDisplayName, type AttentionEvent } from "./sound-pack"
import { applySoundConfig, getConfigPath, type ConfigScope, type SoundConfig } from "./config-patch"

const sizes: LogoSize[] = ["sm", "md", "lg"]

const lineCount = (str: string) => str.split("\n").length
const lineWidth = (str: string) => Math.max(...str.split("\n").map((l) => l.length))

function logoLines(logo: string): string[] {
  return logo.split("\n")
}

const Home = (props: { theme: TuiThemeCurrent; logos: LogoSet; padding: number }) => {
  const dim = useTerminalDimensions()

  const current = createMemo(() => {
    const term = dim()
    const pad = props.padding
    const h = Math.max(0, term.height - pad)
    const w = Math.max(0, term.width - pad)

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
    <box flexDirection="column" alignItems="center">
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

const SettingsDialog = (props: {
  api: TuiPluginApi
  value: () => { enabled: boolean; logo: LogoSettings }
  update: (field: LogoField, next: unknown) => void
  logoIds: readonly string[]
  displayNames: Record<string, string>
  soundSettings: () => SoundConfig
  onSoundSettingsChange: (settings: SoundConfig) => void
}) => {
  const allRows = createMemo(() => getRows(props.logoIds, props.displayNames))

  const rows = createMemo(() => {
    const sound = props.soundSettings()
    const logo = props.value().logo
    return allRows().filter((r) => {
      if (r.key === "logoPadding") return logo.enabled
      if (r.key === "logoSelected") return logo.mode === "fixed"
      if (r.key.startsWith("sound_")) return sound.enabled && sound.override
      if (r.key === "soundOverride") return sound.enabled
      return true
    })
  })

  const [cur, setCur] = createSignal<SettingField>("logoEnabled")
  const theme = createMemo(() => props.api.theme.current)
  const DialogSelect = props.api.ui.DialogSelect

  const fieldMap = createMemo(() => {
    return Object.fromEntries(rows().map((r) => [r.key, r])) as Record<SettingField, SettingRow>
  })

  const current = createMemo(() => fieldMap()[cur()] ?? fieldMap().logoEnabled)

  const options = createMemo(() => {
    const value = props.value()
    return rows().map((item) => {
      let footer: string
      if (item.key === "logoEnabled") {
        footer = status(value.logo.enabled)
      } else if (item.key === "logoPadding") {
        footer = value.logo.padding === "large" ? "Large" : "Small"
      } else if (item.key === "logoMode") {
        footer = modeLabel(value.logo.mode)
      } else if (item.key === "logoSelected") {
        footer = currentLabel(value.logo.selected, props.displayNames)
      } else if (item.key === "soundEnabled") {
        footer = status(props.soundSettings().enabled)
      } else if (item.key === "soundOverride") {
        footer = status(props.soundSettings().override)
      } else if (item.key.startsWith("sound_")) {
        const event = item.key.replace("sound_", "") as AttentionEvent
        footer = getDisplayName(props.soundSettings().mappings[event] ?? "")
      } else {
        footer = ""
      }
      return {
        title: item.title,
        value: item.key,
        description: item.description,
        category: item.category,
        footer,
      }
    })
  })

  const doToggle = (key: SettingField) => {
    if (key === "logoEnabled") {
      const logo = props.value().logo
      props.update("enabled", !logo.enabled)
    } else if (key === "soundEnabled") {
      props.onSoundSettingsChange({ ...props.soundSettings(), enabled: !props.soundSettings().enabled })
    } else if (key === "soundOverride") {
      props.onSoundSettingsChange({ ...props.soundSettings(), override: !props.soundSettings().override })
    }
  }

  useKeyboard((evt) => {
    const item = current()
    if (!item) return

    if ((evt.name === "space" || evt.name === "enter") && item.kind === "toggle") {
      evt.preventDefault()
      evt.stopPropagation()
      doToggle(item.key)
      return
    }

    if ((evt.name === "left" || evt.name === "right" || evt.name === "space" || evt.name === "enter") && item.kind === "select") {
      evt.preventDefault()
      evt.stopPropagation()
      const logo = props.value().logo
      if (item.key === "logoPadding") {
        const next = logo.padding === "large" ? "small" : "large"
        props.update("padding", next)
      } else if (item.key === "logoMode") {
        const next = logo.mode === "fixed" ? "random" : "fixed"
        props.update("mode", next)
      } else if (item.key === "logoSelected") {
        const opts = item.options!
        const idx = opts.findIndex((o) => o.value === logo.selected)
        const delta = evt.name === "left" ? -1 : 1
        const nextIdx = (idx + delta + opts.length) % opts.length
        props.update("selected", opts[nextIdx].value)
      } else if (item.key.startsWith("sound_")) {
        const event = item.key.replace("sound_", "") as AttentionEvent
        const opts = item.options!
        const currentVal = props.soundSettings().mappings[event] ?? ""
        const idx = opts.findIndex((o) => o.value === currentVal)
        const delta = evt.name === "left" ? -1 : 1
        const nextIdx = (idx + delta + opts.length) % opts.length
        const next = opts[nextIdx].value
        const newMappings = { ...props.soundSettings().mappings }
        if (next === "") {
          delete newMappings[event]
        } else {
          newMappings[event] = next
        }
        props.onSoundSettingsChange({ ...props.soundSettings(), mappings: newMappings })
      }
      return
    }
  })

  return (
    <box flexDirection="column">
      <DialogSelect
        title="Arknights: Settings"
        placeholder="Filter settings"
        options={options()}
        current={cur()}
        onMove={(item) => setCur(item.value as SettingField)}
        onSelect={(item) => {
          setCur(item.value as SettingField)
          const next = fieldMap()[item.value as SettingField]
          if (next?.kind === "toggle") {
              doToggle(next.key)
          }
        }}
      />
      <box paddingRight={2} paddingLeft={4} flexDirection="row" gap={2} paddingTop={1} paddingBottom={1} flexShrink={0}>
        <text>
          <span style={{ fg: theme().text }}>
            <b>toggle</b>{" "}
          </span>
          <span style={{ fg: theme().textMuted }}>space enter</span>
        </text>
        <text>
          <span style={{ fg: theme().text }}>
            <b>cycle</b>{" "}
          </span>
          <span style={{ fg: theme().textMuted }}>left/right</span>
        </text>
      </box>
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
            <Home theme={ctx.theme.current} logos={activeLogo()} padding={value().logo.padding === "large" ? 16 : 8} />
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
