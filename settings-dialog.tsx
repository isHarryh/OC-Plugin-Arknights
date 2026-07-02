// @ts-nocheck
/** @jsxImportSource @opentui/solid */
import { useKeyboard } from "@opentui/solid"
import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { createMemo, createSignal } from "solid-js"

export type LogoMode = "fixed" | "random"

export interface LogoSettings {
  enabled: boolean
  mode: LogoMode
  selected: string
}

type Field = "logoEnabled" | "logoMode" | "logoSelected"

interface SettingRow {
  key: Field
  title: string
  description: string
  category: string
  kind: "toggle" | "select"
  options?: { value: string; label: string }[]
}

const getRows = (logoIds: readonly string[], displayNames: Record<string, string>): SettingRow[] => [
  {
    key: "logoEnabled",
    title: "Enable custom logo",
    category: "Visual",
    kind: "toggle",
  },
  {
    key: "logoMode",
    title: "Selection mode",
    category: "Visual",
    kind: "select",
    options: [
      { value: "fixed", label: "Fixed" },
      { value: "random", label: "Random" },
    ],
  },
  {
    key: "logoSelected",
    title: "Selected logo",
    description: "Fixed mode only",
    category: "Visual",
    kind: "select",
    options: logoIds.map((id) => ({
      value: id,
      label: displayNames[id] ?? id,
    })),
  },
]

const status = (value: boolean) => (value ? "ON" : "OFF")

const modeLabel = (mode: string) => (mode === "random" ? "Random" : "Fixed")

const currentLabel = (id: string, displayNames: Record<string, string>) => displayNames[id] ?? id

export const SettingsDialog = (props: {
  api: TuiPluginApi
  value: () => { enabled: boolean; logo: LogoSettings }
  update: (field: string, next: unknown) => void
  logoIds: readonly string[]
  displayNames: Record<string, string>
}) => {
  const rows = createMemo(() => getRows(props.logoIds, props.displayNames))
  const [cur, setCur] = createSignal<Field>("logoEnabled")
  const theme = createMemo(() => props.api.theme.current)
  const DialogSelect = props.api.ui.DialogSelect

  const fieldMap = createMemo(() => {
    return Object.fromEntries(rows().map((r) => [r.key, r])) as Record<Field, SettingRow>
  })

  const current = createMemo(() => fieldMap()[cur()] ?? fieldMap().logoEnabled)
  const options = createMemo(() => {
    const value = props.value()
    return rows().map((item) => {
      let footer: string
      if (item.key === "logoEnabled") footer = status(value.logo.enabled)
      else if (item.key === "logoMode") footer = modeLabel(value.logo.mode)
      else footer = currentLabel(value.logo.selected, props.displayNames)
      return {
        title: item.title,
        value: item.key,
        description: item.description,
        category: item.category,
        footer,
      }
    })
  })

  useKeyboard((evt) => {
    const item = current()
    if (!item) return

    if (evt.name === "space" && item.kind === "toggle") {
      evt.preventDefault()
      evt.stopPropagation()
      const logo = props.value().logo
      if (item.key === "logoEnabled") {
        props.update("enabled", !logo.enabled)
      }
      return
    }

    if (evt.name === "enter" && item.kind === "toggle") {
      evt.preventDefault()
      evt.stopPropagation()
      const logo = props.value().logo
      if (item.key === "logoEnabled") {
        props.update("enabled", !logo.enabled)
      }
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
      }
      return
    }
  })

  return (
    <box flexDirection="column">
      <DialogSelect
        title="Arknights Settings"
        placeholder="Filter settings"
        options={options()}
        current={cur()}
        onMove={(item) => setCur(item.value as Field)}
        onSelect={(item) => {
          setCur(item.value as Field)
          const next = fieldMap()[item.value as Field]
          if (next?.kind === "toggle") {
            const logo = props.value().logo
            if (next.key === "logoEnabled") {
              props.update("enabled", !logo.enabled)
            }
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
