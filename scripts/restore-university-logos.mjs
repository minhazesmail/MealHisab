import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const dir = path.resolve('scripts/logo-payloads')

function readParts(names) {
  return names
    .map((name) => fs.readFileSync(path.join(dir, name), 'utf8').trim())
    .join('')
}

function writeSvg(encoded, output) {
  const svg = zlib.gunzipSync(Buffer.from(encoded, 'base64'))
  fs.mkdirSync(path.dirname(output), { recursive: true })
  fs.writeFileSync(output, svg)
  console.log(`Restored ${output} (${svg.length} bytes)`)
}

const duParts = ['du.0.b64', 'du.1.b64', 'du.2.b64', 'du.3.b64', 'du.4.b64']
const cuParts = [
  'cufix.0.b64',
  'cufix.1.b64',
  'cufix.2.b64',
  'cufix.3.b64',
  'cu.1.b64',
  'cu.2.b64',
  'cu.3.b64',
]

writeSvg(readParts(duParts), 'public/universities/du-original.svg')
writeSvg(readParts(cuParts), 'public/universities/cu-original.svg')
