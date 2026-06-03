import { deflateSync } from 'zlib'
import { writeFileSync } from 'fs'

function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) { c ^= b; for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)) }
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const td  = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}

function createPNG(size) {
  // Fondo oscuro (#08080f) con círculo violeta (#7c6af7)
  const [br, bg, bb] = [0x08, 0x08, 0x0f]
  const [pr, pg, pb] = [0x7c, 0x6a, 0xf7]
  const cx = size / 2, cy = size / 2, r = size * 0.42

  const rows = Buffer.alloc((size * 3 + 1) * size)
  for (let y = 0; y < size; y++) {
    rows[y * (size * 3 + 1)] = 0 // filter None
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy
      const inside = dx * dx + dy * dy <= r * r
      const i = y * (size * 3 + 1) + 1 + x * 3
      rows[i]   = inside ? pr : br
      rows[i+1] = inside ? pg : bg
      rows[i+2] = inside ? pb : bb
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 2 // bit depth 8, color type RGB

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(rows)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

writeFileSync('public/icon-192.png', createPNG(192))
writeFileSync('public/icon-512.png', createPNG(512))
console.log('✓ icon-192.png y icon-512.png generados')
