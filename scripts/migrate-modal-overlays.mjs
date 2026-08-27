import fs from 'fs'
import path from 'path'

const root = path.join(import.meta.dirname, '..', 'src')

const files = []
function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    const st = fs.statSync(p)
    if (st.isDirectory()) walk(p)
    else if (p.endsWith('.tsx')) files.push(p)
  }
}
walk(root)

const openReplacements = [
  [
    '<div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">',
    '<RoveModalOverlay zIndex={100}>',
  ],
  [
    '<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">',
    '<RoveModalOverlay dimClassName="bg-black/70">',
  ],
  [
    '<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">',
    '<RoveModalOverlay>',
  ],
]

let totalOpens = 0
for (const file of files) {
  let text = fs.readFileSync(file, 'utf8')
  if (!text.includes('fixed inset-0 z-')) continue

  let opens = 0
  for (const [from, to] of openReplacements) {
    const parts = text.split(from)
    if (parts.length > 1) {
      opens += parts.length - 1
      text = parts.join(to)
    }
  }
  if (!opens) continue

  text = text.replace(/          <\/div>\r?\n        <\/div>\r?\n      \)\}/g, (m) =>
    m.replace('        </div>', '        </RoveModalOverlay>')
  )

  if (!text.includes('RoveModalOverlay')) continue

  const importPath = file.includes(`${path.sep}contexts${path.sep}`)
    ? '../components/RoveModalOverlay'
    : '../components/RoveModalOverlay'

  if (!text.includes("from '../components/RoveModalOverlay'")) {
    const firstImport = text.match(/^import .+$/m)
    if (firstImport) {
      const insertAt = text.indexOf(firstImport[0]) + firstImport[0].length
      text =
        text.slice(0, insertAt) +
        `\nimport { RoveModalOverlay } from '${importPath}'` +
        text.slice(insertAt)
    }
  }

  fs.writeFileSync(file, text)
  totalOpens += opens
  console.log(`${opens} overlays -> ${path.relative(root, file)}`)
}

console.log('Total overlays:', totalOpens)
