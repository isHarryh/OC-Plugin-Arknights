/*
 * Server entrypoint. The plugin is purely a TUI plugin, but a server entry is
 * kept so the package can be enabled from `opencode.json`. The CLI only loads
 * a server plugin's TUI part once the server reports it as active.
 */
import { Plugin } from "@opencode/plugin"

const plugin = Plugin.define({
  id: "oc-plugin-arknights",
  setup() {},
})

export default plugin
