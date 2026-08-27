import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

function restore(prefix, output) {
  const dir = path.resolve('scripts/logo-payloads')
  const parts = fs
    .readdirSync(dir)
    .filter((name) => name.startsWith(`${prefix}.`) && name.endsWith('.b64'))
    .sort((a, b) => Number(a.split('.')[1]) - Number(b.split('.')[1]))

  if (!parts.length) {
    throw new Error(`No payload parts found for ${prefix}`)
  }

  const encoded = parts
    .map((name) => fs.readFileSync(path.join(dir, name), 'utf8').trim())
    .join('')

  const svg = zlib.gunzipSync(Buffer.from(encoded, 'base64'))
  fs.mkdirSync(path.dirname(output), { recursive: true })
  fs.writeFileSync(output, svg)
  console.log(`Restored ${output} (${svg.length} bytes)`)
}

restore('du', 'public/universities/du-original.svg')
restore('cu', 'public/universities/cu-original.svg')
