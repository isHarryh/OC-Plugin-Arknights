import { attentionEvents, audioFiles, getDisplayName, type AttentionEvent } from "./sound-pack"

export type LogoMode = "fixed" | "random"

export interface LogoSettings {
  enabled: boolean
  padding: "large" | "small"
  mode: LogoMode
  selected: string
}

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

export const status = (value: boolean) => (value ? "YES" : "NO")

export const modeLabel = (mode: string) => (mode === "random" ? "Random" : "Fixed")

export const currentLabel = (id: string, displayNames: Record<string, string>) => displayNames[id] ?? id
