// Regenerates the images the README uses.
import { writeFileSync, mkdirSync } from 'node:fs'
import { endgrain, SPECIES } from '../src/endgrain.js'

const dir = new URL('../examples/', import.meta.url)
mkdirSync(dir, { recursive: true })

const row = (items, cell = 160, gap = 16) => {
  let out = `<svg xmlns="http://www.w3.org/2000/svg" width="${items.length * (cell + gap) - gap}" height="${cell}">`
  items.forEach(([seed, opts], i) => {
    out += endgrain(seed, { ...opts, size: cell, title: false }).replace('<svg ', `<svg x="${i * (cell + gap)}" `)
  })
  return out + '</svg>\n'
}

writeFileSync(new URL('names.svg', dir), row(['ada', 'grace', 'linus', 'margaret', 'ken'].map((s) => [s, {}])))
writeFileSync(new URL('species.svg', dir), row(Object.keys(SPECIES).map((species) => ['endgrain', { species, age: 24 }]), 128))
writeFileSync(new URL('shapes.svg', dir), row(['log', 'circle', 'square'].map((shape) => ['quietwright', { shape }])))
console.log('examples written')
