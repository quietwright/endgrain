// Renders a grid of seeds into one SVG, for eyeballing changes.
import { endgrain } from '../src/endgrain.js'

const [, , shape = 'log', ...seeds] = process.argv
const list = seeds.length ? seeds : ['quietwright', 'gustavo', 'alice', 'bob', 'carol', 'dave', 'erin', 'frank', 'grace', 'heidi', 'ivan', 'judy']
const cell = 200, cols = 4
const rows = Math.ceil(list.length / cols)
let out = `<svg xmlns="http://www.w3.org/2000/svg" width="${cols * cell}" height="${rows * cell}"><rect width="100%" height="100%" fill="#f4efe6"/>`
list.forEach((seed, i) => {
  const svg = endgrain(seed, { size: cell - 16, shape }).replace('<svg ', `<svg x="${(i % cols) * cell + 8}" y="${Math.floor(i / cols) * cell + 8}" `)
  out += svg
})
process.stdout.write(out + '</svg>')
