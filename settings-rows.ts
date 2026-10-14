import { attentionEvents, audioFiles, getDisplayName, type AttentionEvent } from "./sound-pack"
import type { Settings } from "./settings"

type LogoSettingKey = "logoEnabled" | "logoPadding" | "logoMode" | "logoSelected"

type SoundField = "soundEnabled" | "soundOverride" | `sound_${AttentionEvent}`

export type SettingField = LogoSettingKey | SoundField

export interface SettingRow {
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
    key: "logoPadding",
    title: "- Home logo padding",
    category: "Visual",
    kind: "select",
    options: [
      { value: "large", label: "Large" },
      { value: "small", label: "Small" },
    ],
  },
  {
    key: "logoMode",
    title: "Logo selection mode",
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

export const getRows = (logoIds: readonly string[], displayNames: Record<string, string>): SettingRow[] => [
  ...logoRows(logoIds, displayNames),
  ...soundRows(),
]

/** Dependent rows stay hidden while their parent setting is off. */
export const isRowVisible = (row: SettingRow, settings: Settings): boolean => {
  if (row.kind === "toggle") return true
  if (row.key === "logoPadding") return settings.logo.enabled
  if (row.key === "logoSelected") return settings.logo.mode === "fixed"
  if (row.key === "soundOverride") return settings.sound_pack.enabled
  if (row.key.startsWith("sound_")) return settings.sound_pack.enabled && settings.sound_pack.override
  return true
}

export const status = (value: boolean) => (value ? "YES" : "NO")

/** Attention event a `sound_*` row configures. */
export const soundEvent = (key: SettingField) => key.replace("sound_", "") as AttentionEvent

/** Current value of a select row, used to preselect the value dialog. */
export const rowValue = (row: SettingRow, settings: Settings): string => {
  if (row.key === "logoPadding") return settings.logo.padding
  if (row.key === "logoMode") return settings.logo.mode
  if (row.key === "logoSelected") return settings.logo.selected
  if (row.key.startsWith("sound_")) return settings.sound_pack.mappings[soundEvent(row.key)] ?? ""
  return ""
}

export const rowFooter = (row: SettingRow, settings: Settings): string => {
  if (row.key === "logoEnabled") return status(settings.logo.enabled)
  if (row.key === "soundEnabled") return status(settings.sound_pack.enabled)
  if (row.key === "soundOverride") return status(settings.sound_pack.override)
  const value = rowValue(row, settings)
  return row.options?.find((option) => option.value === value)?.label ?? ""
}
