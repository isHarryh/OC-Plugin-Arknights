import sharp from "sharp"
import { readdir, mkdir, writeFile } from "node:fs/promises"
import { join, basename } from "node:path"

const INPUT_DIR = "assets/logos_raw"
const OUTPUT_DIR = "assets/logos"

interface SizeSpec {
  name: string
  charWidth: number
}

const SIZES: SizeSpec[] = [
  { name: "sm", charWidth: 16 },
  { name: "md", charWidth: 32 },
  { name: "lg", charWidth: 64 },
]

function extractId(filename: string): string {
  const base = basename(filename, ".png")
  return base.replace(/^logo_/i, "").toLowerCase()
}

const EMPTY_BRAILLE = String.fromCodePoint(0x2800)

function isBlankLine(line: string): boolean {
  return line.split("").every((ch) => ch === EMPTY_BRAILLE)
}

function trimBlankEdges(lines: string[]): string[] {
  let start = 0
  let end = lines.length

  while (start < end && isBlankLine(lines[start])) start++
  while (end > start && isBlankLine(lines[end - 1])) end--

  if (start > 0) start = Math.max(0, start - 1)
  if (end < lines.length) end = Math.min(lines.length, end + 1)

  return lines.slice(start, end)
}

function rgbToLuma(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b
}

function buildBrailleChar(cells: number[][]): string {
  let mask = 0
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 2; col++) {
      if (cells[row][col] >= 128) {
        const dotNumber =
          col === 0 ? (row < 3 ? row + 1 : 7) : row < 3 ? row + 4 : 8
        mask |= 1 << (dotNumber - 1)
      }
    }
  }
  return String.fromCodePoint(0x2800 + mask)
}

async function pngToBraille(
  inputPath: string,
  charWidth: number,
): Promise<string[]> {
  const pxWidth = charWidth * 2
  const img = sharp(inputPath)

  const metadata = await img.metadata()
  if (!metadata.width || !metadata.height) {
    throw new Error(`Cannot read dimensions of ${inputPath}`)
  }

  const aspectRatio = metadata.width / metadata.height
  const pxHeight = Math.ceil(pxWidth / aspectRatio)
  const charHeight = Math.ceil(pxHeight / 4)
  const finalPxHeight = charHeight * 4

  const { data, info } = await img
    .resize(pxWidth, finalPxHeight, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true })

  const channels = info.channels || 3
  const lines: string[] = []

  for (let cy = 0; cy < charHeight; cy++) {
    let line = ""
    for (let cx = 0; cx < charWidth; cx++) {
      const cells: number[][] = Array.from({ length: 4 }, () => [0, 0])
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 2; col++) {
          const px = cx * 2 + col
          const py = cy * 4 + row
          const idx = (py * info.width + px) * channels
          const r = data[idx]
          const g = data[idx + 1]
          const b = data[idx + 2]
          cells[row][col] = rgbToLuma(r, g, b)
        }
      }
      line += buildBrailleChar(cells)
    }
    lines.push(line)
  }

  return lines
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true })

  const files = (await readdir(INPUT_DIR)).filter((f) => f.endsWith(".png"))

  for (const file of files) {
    const id = extractId(file)
    const inputPath = join(INPUT_DIR, file)

    for (const size of SIZES) {
      let lines = await pngToBraille(inputPath, size.charWidth)
      lines = trimBlankEdges(lines)
      const txtPath = join(OUTPUT_DIR, `logo_${id}_${size.name}.txt`)
      await writeFile(txtPath, lines.join("\n"), "utf-8")
    }

    console.log(`Converted ${file} → ${SIZES.length} sizes`)
  }

  console.log(`\nDone. ${files.length} logos written to ${OUTPUT_DIR}`)
}

main().catch((err) => {
  console.error("Conversion failed:", err)
  process.exit(1)
})
