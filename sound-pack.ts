/*
 * Attention sound pack: maps OpenCode's 6 built-in attention events to
 * Arknights base building voice lines (.mp3 files under assets/audio/).
 *
 * Files are resolved at runtime relative to this module's directory.
 */

import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const AUDIO_DIR = join(__dirname, "assets", "audio")

export const attentionEvents = [
  "default",
  "question",
  "permission",
  "error",
  "done",
  "subagent_done",
] as const

export type AttentionEvent = (typeof attentionEvents)[number]

export type SoundMappings = Partial<Record<AttentionEvent, string>>

export const defaultMappings: SoundMappings = {
  question: "vox_new_product_options.mp3",
  permission: "vox_risk_detected.mp3",
  error: "vox_mission_failed.mp3",
  done: "vox_mission_accomplished.mp3",
  subagent_done: "vox_infra_complete.mp3",
}

const audioFileEntries = [
  ["vox_building.mp3", "Building"],
  ["vox_cancelled.mp3", "Cancelled"],
  ["vox_cannot_comply.mp3", "Cannot Comply"],
  ["vox_cannot_deploy_here.mp3", "Cannot Deploy Here"],
  ["vox_debris_cleared.mp3", "Debris Cleared"],
  ["vox_debris_clearing.mp3", "Debris Clearing"],
  ["vox_decoration_deployed.mp3", "Decoration Deployed"],
  ["vox_facility_removed.mp3", "Facility Removed"],
  ["vox_facility_removing.mp3", "Facility Removing"],
  ["vox_infra_complete.mp3", "Infrastructure Complete"],
  ["vox_infra_garrisoned.mp3", "Infrastructure Garrisoned"],
  ["vox_infra_offline.mp3", "Infrastructure Offline"],
  ["vox_infra_online.mp3", "Infrastructure Online"],
  ["vox_infra_sold.mp3", "Infrastructure Sold"],
  ["vox_insufficient_funds.mp3", "Insufficient Funds"],
  ["vox_low_power.mp3", "Low Power"],
  ["vox_mission_accomplished.mp3", "Mission Accomplished"],
  ["vox_mission_failed.mp3", "Mission Failed"],
  ["vox_new_garrison_options.mp3", "New Garrison Options"],
  ["vox_new_infra_options.mp3", "New Infrastructure Options"],
  ["vox_new_product_options.mp3", "New Production Options"],
  ["vox_no_idle_uav.mp3", "No Idle UAV"],
  ["vox_on_hold.mp3", "On Hold"],
  ["vox_operator_promoted.mp3", "Operator Promoted"],
  ["vox_operator_ready.mp3", "Operator Ready"],
  ["vox_primary_building_selected.mp3", "Primary Building Selected"],
  ["vox_products_received.mp3", "Products Received"],
  ["vox_repairing.mp3", "Repairing"],
  ["vox_resources_received.mp3", "Resources Received"],
  ["vox_risk_detected.mp3", "Risk Detected"],
  ["vox_training.mp3", "Training"],
  ["vox_uav_maintained.mp3", "UAV Maintained"],
  ["vox_unit_ready.mp3", "Unit Ready"],
  ["vox_upgrading.mp3", "Upgrading"],
] as const

export const audioFiles = audioFileEntries.map(
  ([file]) => file,
) as unknown as readonly string[] & (readonly AudioFile[])

export type AudioFile = (typeof audioFileEntries)[number][0]

const displayNameMap = new Map<string, string>(audioFileEntries)

export function getSoundPath(file: string): string {
  return join(AUDIO_DIR, file)
}

export function validateMappings(
  mappings: Record<string, unknown>,
): SoundMappings {
  const result: SoundMappings = {}
  for (const event of attentionEvents) {
    const val = mappings[event]
    if (typeof val === "string" && audioFiles.includes(val as AudioFile)) {
      result[event] = val
    }
  }
  return result
}

export function getDisplayName(file: string): string {
  if (!file) return "<Unset>"
  return displayNameMap.get(file) ?? file
}
