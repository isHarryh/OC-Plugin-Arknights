// @ts-nocheck
/** @jsxImportSource @opentui/solid */
import type { TuiPlugin, TuiPluginModule } from "@opencode-ai/plugin/tui"

const id = "arknights"

const tui: TuiPlugin = async (_api, _options) => {
  return
}

const plugin: TuiPluginModule & { id: string } = {
  id,
  tui,
}

export default plugin
