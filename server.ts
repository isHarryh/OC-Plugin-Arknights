// @ts-nocheck
import type { Plugin } from "@opencode-ai/plugin"

const id = "arknights"

const server: Plugin = async (_input, _options?: Record<string, unknown>) => {
  return {}
}

const plugin: { id: string; server: Plugin } = {
  id,
  server,
}

export default plugin
