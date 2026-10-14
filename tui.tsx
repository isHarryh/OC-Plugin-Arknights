/** @jsxImportSource @opentui/solid */
import { useTerminalDimensions } from "@opentui/solid"
import { Plugin } from "@opencode/plugin/tui"
import type { Context } from "@opencode/plugin/tui/context"
import { createMemo, For, Show } from "solid-js"
import { displayNames, getLogo, logoIds, type LogoSet, type LogoSize } from "./logos"
import { cfg, command, id, pickRandomLogo, sanitize, type Settings } from "./settings"
import { getRows, isRowVisible, rowFooter, rowValue, soundEvent, type SettingField } from "./settings-rows"
import { applySoundConfig, getConfigPath } from "./config-patch"

type Theme = Context["theme"]

const sizes: LogoSize[] = ["sm", "md", "lg"]

const lineCount = (str: string) => str.split("\n").length
const lineWidth = (str: string) => Math.max(...str.split("\n").map((l) => l.length))

function logoLines(logo: string): string[] {
  return logo.split("\n")
}

const Home = (props: { theme: Theme; logos: LogoSet; padding: number }) => {
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

  const color = (index: number) => {
    if (!current().isDefault) return props.theme.text.action.primary.base
    return index < 2 ? props.theme.text.muted : props.theme.text.base
  }

  return (
    <box flexDirection="column" alignItems="center">
      <For each={current().lines}>
        {(line, index) => <text fg={color(index())}>{line}</text>}
      </For>
    </box>
  )
}

export default Plugin.define({
  id,
  setup(context) {
    const boot = cfg(context.options)
    if (!boot.enabled) return

    const [stored, updateSettings] = context.storage.store("settings", {
      initial: { logo: boot.logo, sound_pack: boot.sound_pack },
    })

    const state = (): Settings => sanitize(stored, boot)

    const activeLogo = (): LogoSet => {
      const logo = state().logo
      const selected = logo.mode === "fixed" ? logo.selected : pickRandomLogo("rhodes")
      return getLogo(selected) ?? getLogo("rhodes")
    }

    const toggleField = (key: SettingField) =>
      updateSettings((draft) => {
        if (key === "logoEnabled") draft.logo.enabled = !draft.logo.enabled
        else if (key === "soundEnabled") draft.sound_pack.enabled = !draft.sound_pack.enabled
        else if (key === "soundOverride") draft.sound_pack.override = !draft.sound_pack.override
      })

    const setField = (key: SettingField, value: string) =>
      updateSettings((draft) => {
        if (key === "logoPadding") draft.logo.padding = value === "small" ? "small" : "large"
        else if (key === "logoMode") draft.logo.mode = value === "fixed" ? "fixed" : "random"
        else if (key === "logoSelected") draft.logo.selected = value
        else if (key.startsWith("sound_")) {
          const event = soundEvent(key)
          if (value) draft.sound_pack.mappings[event] = value
          else delete draft.sound_pack.mappings[event]
        }
      })

    const showSettings = async () => {
      let cursor: SettingField | undefined
      for (;;) {
        const settings = state()
        const rows = getRows(logoIds, displayNames).filter((row) => isRowVisible(row, settings))
        const current = rows.some((row) => row.key === cursor) ? cursor : undefined

        const picked = await context.ui.dialog.select<SettingField>({
          title: "Arknights: Settings",
          placeholder: "Filter settings",
          current,
          options: rows.map((row) => ({
            title: row.title,
            value: row.key,
            description: row.description,
            footer: rowFooter(row, settings),
            category: row.category,
          })),
        })
        if (picked === undefined) return
        cursor = picked

        const row = rows.find((item) => item.key === picked)
        if (!row) continue

        if (row.kind === "toggle") {
          await toggleField(row.key)
          continue
        }

        const value = await context.ui.dialog.select<string>({
          title: row.title,
          options: (row.options ?? []).map((option) => ({ title: option.label, value: option.value })),
          current: rowValue(row, settings),
        })
        if (value === undefined) continue
        await setField(row.key, value)
      }
    }

    const showApplySoundConfig = async () => {
      const path = getConfigPath()
      const confirmed = await context.ui.dialog.confirm({
        title: "Apply Sound Config",
        message: `Write attention sound settings to ${path}?`,
        label: { confirm: "Apply", cancel: "Cancel" },
      })
      if (!confirmed) return

      const sound = state().sound_pack
      const result = applySoundConfig({
        enabled: sound.enabled,
        override: sound.override,
        mappings: sound.mappings,
      })
      context.ui.toast.show({
        title: "Arknights",
        message: result.message,
        variant: result.success ? "success" : "error",
      })
    }

    // `mode: "global"` keeps the commands reachable while a dialog mode is
    // pushed, which is what the command palette needs.
    context.keymap.layer(() => ({
      mode: "global",
      commands: [
        {
          id: command.settings,
          title: "Arknights: Settings",
          group: "System",
          palette: true,
          run: () => void showSettings(),
        },
        {
          id: command.applyAudioConfig,
          title: "Arknights: Apply Sound Config",
          group: "System",
          palette: true,
          run: () => void showApplySoundConfig(),
        },
      ],
    }))

    // V2 has no home logo slot, so the logo is prepended to the home footer.
    // Switch to `replace: "home.logo"` once upstream lands that slot.
    context.ui.slot({
      prepend: "home.footer",
      render: () => (
        <Show when={state().logo.enabled}>
          <Home
            theme={context.theme}
            logos={activeLogo()}
            padding={state().logo.padding === "large" ? 16 : 8}
          />
        </Show>
      ),
    })
  },
})
