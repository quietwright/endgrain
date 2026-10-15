#!/usr/bin/env node
import { writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { endgrain, grow, describe, SPECIES } from '../src/endgrain.js'

const usage = `usage: endgrain <seed> [options]

  -s, --size <px>        width and height of the SVG (default 256)
      --shape <shape>    log | square | circle (default log)
      --species <name>   ${Object.keys(SPECIES).join(' | ')} (default: from the seed)
      --age <years>      number of rings, 3-200 (default: from the seed)
  -o, --out <file>       write to a file instead of stdout
  -d, --describe         print the tree's description instead of the SVG
  -h, --help             show this help`

let parsed
try {
  parsed = parseArgs({
    allowPositionals: true,
    options: {
      size: { type: 'string', short: 's' },
      shape: { type: 'string' },
      species: { type: 'string' },
      age: { type: 'string' },
      out: { type: 'string', short: 'o' },
      describe: { type: 'boolean', short: 'd' },
      help: { type: 'boolean', short: 'h' },
    },
  })
} catch (err) {
  console.error(`endgrain: ${err.message}\n\n${usage}`)
  process.exit(2)
}

const { values, positionals } = parsed
if (values.help || positionals.length !== 1) {
  console[values.help ? 'log' : 'error'](usage)
  process.exit(values.help ? 0 : 2)
}

const options = {
  size: values.size === undefined ? undefined : Number(values.size),
  shape: values.shape,
  species: values.species,
  age: values.age === undefined ? undefined : Number(values.age),
}

try {
  const [seed] = positionals
  const text = values.describe ? describe(grow(seed, options)) + '\n' : endgrain(seed, options) + '\n'
  if (values.out) writeFileSync(values.out, text)
  else process.stdout.write(text)
} catch (err) {
  console.error(`endgrain: ${err.message}`)
  process.exit(1)
}
