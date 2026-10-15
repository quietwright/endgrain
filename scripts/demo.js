// Builds demo.html: one file, the library inlined, opens straight from disk.
import { readFileSync, writeFileSync } from 'node:fs'

const src = readFileSync(new URL('../src/endgrain.js', import.meta.url), 'utf8').replace(/^export /gm, '')
const template = readFileSync(new URL('./demo.template.html', import.meta.url), 'utf8')
writeFileSync(new URL('../demo.html', import.meta.url), template.replace('/*__ENDGRAIN__*/', () => src))
console.log('demo.html written')
