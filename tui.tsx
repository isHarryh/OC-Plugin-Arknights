// @ts-nocheck
/** @jsxImportSource @opentui/solid */
import { useTerminalDimensions } from "@opentui/solid"
import type { TuiPlugin, TuiPluginApi, TuiPluginModule, TuiThemeCurrent } from "@opencode-ai/plugin/tui"
import { createMemo, createSignal, Show } from "solid-js"
import { displayNames, getLogo, logoIds, type LogoSet, type LogoSize } from "./logos"
import { SettingsDialog } from "./settings-dialog"

const id = "arknights"

const command = {
  settings: "arknights.settings",
}

type LogoCfg = {
  enabled: boolean
  mode: "fixed" | "random"
  selected: string
}

type Cfg = {
  enabled: boolean
  logo: LogoCfg
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
  return {
    enabled: bool(opts?.enabled, true),
    logo: {
      enabled: bool(logo?.enabled, true),
      mode: pickStr(logo?.mode, "random", ["fixed", "random"] as const),
      selected: pickStr(logo?.selected, "rhodes", logoIds),
    },
  }
}

const settingKey = {
  logoEnabled: `${id}.logo.enabled`,
  logoMode: `${id}.logo.mode`,
  logoSelected: `${id}.logo.selected`,
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

const withKV = (api: TuiPluginApi, value: Cfg): Cfg => {
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

  const update = (field: LogoField, next: unknown) => {
    const prev = value()
    const prevLogo = prev.logo
    if (prevLogo[field] === next) return
    const newLogo = { ...prevLogo, [field]: next }
    setValue({ ...prev, logo: newLogo })
    api.kv.set(logoFieldToKV(field), newLogo[field])
  }

  const showSettings = () => {
    api.ui.dialog.replace(() => (
      <SettingsDialog
        api={api}
        value={value}
        update={update}
        logoIds={logoIds}
        displayNames={displayNames}
      />
    ))
  }

  api.keymap.registerLayer({
    commands: [
      {
        name: command.settings,
        title: "Arknights Settings",
        category: "System",
        namespace: "palette",
        run() {
          showSettings()
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
