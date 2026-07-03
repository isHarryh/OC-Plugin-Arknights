// @ts-nocheck
/** @jsxImportSource @opentui/solid */
import { useKeyboard } from "@opentui/solid"
import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { createMemo, createSignal } from "solid-js"
import {
  attentionEvents,
  audioFiles,
  getDisplayName,
  type AttentionEvent,
} from "./sound-pack"
import type { SoundConfig } from "./config-patch"

export type LogoMode = "fixed" | "random"

export interface LogoSettings {
  enabled: boolean
  mode: LogoMode
  selected: string
}

type LogoField = "logoEnabled" | "logoMode" | "logoSelected"

type SoundField = "soundEnabled" | "soundOverride" | `sound_${AttentionEvent}`

type SettingField = LogoField | SoundField

interface SettingRow {
  key: SettingField
  title: string
  category: string
  kind: "toggle" | "select"
  description?: string
  options?: { value: string; label: string }[]
}

const logoRows = (
  logoIds: readonly string[],
  displayNames: Record<string, string>,
): SettingRow[] => [
  {
    key: "logoEnabled",
    title: "Override home logo",
    category: "Visual",
    kind: "toggle",
  },
  {
    key: "logoMode",
    title: "- Selection mode",
    category: "Visual",
    kind: "select",
    options: [
      { value: "fixed", label: "Fixed" },
      { value: "random", label: "Random" },
    ],
  },
  {
    key: "logoSelected",
    title: "- Selected logo",
    description: "Fixed mode only",
    category: "Visual",
    kind: "select",
    options: logoIds.map((id) => ({
      value: id,
      label: displayNames[id] ?? id,
    })),
  },
]

const soundRows = (): SettingRow[] => {
  const audioOpts = [
    { value: "", label: "<Unset>" },
    ...audioFiles.map((f) => ({
      value: f,
      label: getDisplayName(f),
    })),
  ]
  const eventRows: SettingRow[] = attentionEvents.map((event) => ({
    key: `sound_${event}` as SoundField,
    title: `- ${event === "subagent_done" ? "Subagent Done" : event.charAt(0).toUpperCase() + event.slice(1)}`,
    category: "Sound",
    kind: "select",
    options: audioOpts,
  }))
  return [
    {
      key: "soundEnabled",
      title: "Enable attention sounds",
      category: "Sound",
      kind: "toggle",
    },
    {
      key: "soundOverride",
      title: "Override sound pack",
      category: "Sound",
      kind: "toggle",
    },
    ...eventRows,
  ]
}

const getRows = (logoIds: readonly string[], displayNames: Record<string, string>): SettingRow[] => [
  ...logoRows(logoIds, displayNames),
  ...soundRows(),
]

const status = (value: boolean) => (value ? "YES" : "NO")

const modeLabel = (mode: string) => (mode === "random" ? "Random" : "Fixed")

const currentLabel = (id: string, displayNames: Record<string, string>) => displayNames[id] ?? id

export const SettingsDialog = (props: {
  api: TuiPluginApi
  value: () => { enabled: boolean; logo: LogoSettings }
  update: (field: LogoField, next: unknown) => void
  logoIds: readonly string[]
  displayNames: Record<string, string>
  soundSettings: () => SoundConfig
  onSoundSettingsChange: (settings: SoundConfig) => void
}) => {
  const rows = createMemo(() => getRows(props.logoIds, props.displayNames))
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

    if ((evt.name === "left" || evt.name === "right") && item.kind === "select") {
      evt.preventDefault()
      evt.stopPropagation()
      const logo = props.value().logo
      if (item.key === "logoMode") {
        const next = logo.mode === "fixed" ? "random" : "fixed"
        props.update("mode", next)
      } else if (item.key === "logoSelected") {
        const opts = item.options!
        const idx = opts.findIndex((o) => o.value === logo.selected)
        const delta = evt.name === "right" ? 1 : -1
        const nextIdx = (idx + delta + opts.length) % opts.length
        props.update("selected", opts[nextIdx].value)
      } else if (item.key.startsWith("sound_")) {
        const event = item.key.replace("sound_", "") as AttentionEvent
        const opts = item.options!
        const currentVal = props.soundSettings().mappings[event] ?? ""
        const idx = opts.findIndex((o) => o.value === currentVal)
        const delta = evt.name === "right" ? 1 : -1
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
