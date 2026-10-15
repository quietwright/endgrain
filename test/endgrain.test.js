import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { endgrain, grow, describe, SPECIES } from '../src/endgrain.js'

test('the same seed always grows the same tree', () => {
  assert.equal(endgrain('quietwright'), endgrain('quietwright'))
})

test('different seeds grow different trees', () => {
  const seen = new Set(['a', 'b', 'c', 'ab', 'ba', '', ' '].map((s) => endgrain(s)))
  assert.equal(seen.size, 7)
})

test('output is pinned, so a change in look is a deliberate one', () => {
  // If you changed the algorithm on purpose, update this hash and bump the minor version.
  const svg = endgrain('pinned')
  let h = 0
  for (let i = 0; i < svg.length; i++) h = (Math.imul(h, 31) + svg.charCodeAt(i)) | 0
  assert.equal(h, PINNED)
})

test('rings never cross', () => {
  for (const seed of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
    const { rings } = grow(seed)
    for (let y = 1; y < rings.length; y++) {
      for (let i = 0; i < rings[y].length; i++) assert.ok(rings[y][i] > rings[y - 1][i])
    }
  }
})

test('options override the seed', () => {
  const tree = grow('x', { species: 'walnut', age: 7 })
  assert.equal(tree.species, SPECIES.walnut)
  assert.equal(tree.rings.length, 7)
  assert.match(describe(tree), /^A 7-year-old walnut/)
})

test('every shape renders a well-formed, titled svg', () => {
  for (const shape of ['log', 'square', 'circle']) {
    const svg = endgrain('shape', { shape, size: 64 })
    assert.match(svg, /^<svg [^>]*width="64" height="64"/)
    assert.match(svg, /<title>A \d+-year-old \w+/)
    assert.ok(svg.endsWith('</svg>'))
    assert.ok(!/NaN|undefined|Infinity/.test(svg), `bad number in ${shape}`)
  }
})

test('seeds are escaped nowhere they could leak', () => {
  const svg = endgrain('<script>"&', { background: '"><x' })
  assert.ok(!svg.includes('<script>'))
  assert.ok(!svg.includes('"><x'))
})

test('bad options throw readable errors', () => {
  assert.throws(() => endgrain('x', { species: 'balsa' }), /unknown species "balsa"/)
  assert.throws(() => endgrain('x', { shape: 'hexagon' }), /unknown shape/)
  assert.throws(() => endgrain('x', { age: 1 }), /age must be/)
})

test('cli prints svg and descriptions', () => {
  const bin = new URL('../bin/endgrain.js', import.meta.url).pathname
  assert.equal(execFileSync(process.execPath, [bin, 'pinned']).toString().trim(), endgrain('pinned'))
  assert.match(execFileSync(process.execPath, [bin, 'x', '-d', '--species', 'oak']).toString(), /^A \d+-year-old oak/)
})

const PINNED = -2117430123

test('overriding species or age keeps the rest of the tree', () => {
  const base = grow('steady')
  const other = grow('steady', { species: base.species.name === 'oak' ? 'ash' : 'oak' })
  assert.deepEqual(other.rings, base.rings)
  assert.deepEqual(other.checks, base.checks)
  const younger = grow('steady', { age: 5 })
  assert.deepEqual(younger.rings, base.rings.slice(0, 5))
  assert.deepEqual(younger.checks, base.checks)
})
