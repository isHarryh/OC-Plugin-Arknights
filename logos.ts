/*
 * Logo art data is stored as .txt files under assets/logos/.
 * This module loads them at runtime.
 *
 * To regenerate the .txt files from raw PNGs, run:
 *   npx tsx scripts/png-to-braille.ts
 */

import { readFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const LOGOS_DIR = join(__dirname, "assets", "logos")

export const displayNames: Record<string, string> = {
  abyssal: "Abyssal Hunters",
  action4: "Op Reserve A4",
  babel: "Babel",
  blacksteel: "Blacksteel",
  bolivar: "Bolívar",
  chiave: "Chiave's Gang",
  columbia: "Columbia",
  dublinn: "Dublinn",
  egir: "Ægir",
  elite: "Rhodes Island Elite Op",
  followers: "Followers",
  glasgow: "Glasgow",
  higashi: "Higashi",
  iberia: "Iberia",
  karlan: "Karlan Trade",
  kazimierz: "Kazimierz",
  kjerag: "Kjerag",
  laios: "Laios's Gang",
  laterano: "Laterano",
  lee: "Lee's Detective Agency",
  leithanien: "Leithanien",
  lgd: "Lungmen Guard Dept",
  lungmen: "Lungmen",
  minos: "Minos",
  penguin: "Penguin Logistics",
  pinus: "Pinus Sylvestris",
  rainbow: "Team Rainbow",
  reserve1: "Op Reserve A1",
  reserve4: "Op Reserve A4",
  reserve6: "Op Reserve A6",
  rhine: "Rhine Lab",
  rhodes: "Rhodes Island",
  rim: "Rim Billiton",
  sami: "Sami",
  sargon: "Sargon",
  siesta: "Siesta",
  siracusa: "Siracusa",
  student: "Ursus Student Group",
  sui: "Sui",
  sweep: "S.W.E.E.P.",
  tara: "Tara",
  ursus: "Ursus",
  victoria: "Victoria",
  yan: "Yan",
}

export interface LogoSet {
  sm: string
  md: string
  lg: string
}

export const sizes = ["sm", "md", "lg"] as const
export type LogoSize = (typeof sizes)[number]
export const logoIds = Object.keys(displayNames) as (keyof typeof displayNames)[]

const cache = new Map<string, LogoSet>()

export function getLogo(id: string): LogoSet {
  let entry = cache.get(id)
  if (!entry) {
    const readSafe = (name: string) => {
      try {
        return readFileSync(join(LOGOS_DIR, name), "utf-8")
      } catch {
        return ""
      }
    }
    entry = {
      sm: readSafe(`logo_${id}_sm.txt`),
      md: readSafe(`logo_${id}_md.txt`),
      lg: readSafe(`logo_${id}_lg.txt`),
    }
    cache.set(id, entry)
  }
  return entry
}
