// ホーム画面に追加したときのアイコン（PNG）を作るスクリプト。
// 外部ライブラリを使わず、Node標準の zlib だけでPNGを書き出している。
// 使い方: node scripts/generate-icons.mjs

import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

const BG = [0x2f, 0x7d, 0x62] // アプリの緑
const PAPER = [0xff, 0xff, 0xff]
const LINE = [0xbf, 0xd8, 0xcd]
const MARK = [0x2f, 0x7d, 0x62]

function crc32(buf) {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i += 1) {
    crc ^= buf[i]
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(typeAndData))
  return Buffer.concat([length, typeAndData, crc])
}

function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0 // フィルタなし
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/** 角丸四角形の内側かどうか（0〜1の被り具合を返す。境界をなめらかにするため4x4で標本化） */
function roundRectCoverage(px, py, x, y, w, h, r) {
  let hits = 0
  for (let sy = 0; sy < 4; sy += 1) {
    for (let sx = 0; sx < 4; sx += 1) {
      const fx = px + (sx + 0.5) / 4
      const fy = py + (sy + 0.5) / 4
      const cx = Math.min(Math.max(fx, x + r), x + w - r)
      const cy = Math.min(Math.max(fy, y + r), y + h - r)
      const dx = fx - cx
      const dy = fy - cy
      const inside =
        fx >= x && fx <= x + w && fy >= y && fy <= y + h && dx * dx + dy * dy <= r * r + 1e-9
      const inStraight =
        fx >= x && fx <= x + w && fy >= y + r && fy <= y + h - r
      const inStraight2 =
        fx >= x + r && fx <= x + w - r && fy >= y && fy <= y + h
      if (inside || inStraight || inStraight2) hits += 1
    }
  }
  return hits / 16
}

function blend(buf, index, color, alpha) {
  for (let c = 0; c < 3; c += 1) {
    buf[index + c] = Math.round(buf[index + c] * (1 - alpha) + color[c] * alpha)
  }
  buf[index + 3] = 255
}

/**
 * アイコンを1枚描く。
 * padding はマスカブル用に中身を小さくするための余白の割合。
 */
function drawIcon(size, padding) {
  const buf = Buffer.alloc(size * size * 4)
  // 背景（全面を緑で塗る）
  for (let i = 0; i < size * size; i += 1) {
    buf[i * 4] = BG[0]
    buf[i * 4 + 1] = BG[1]
    buf[i * 4 + 2] = BG[2]
    buf[i * 4 + 3] = 255
  }

  const inner = size * (1 - padding * 2)
  const offset = size * padding

  // ノート（白い角丸四角）
  const noteW = inner * 0.62
  const noteH = inner * 0.78
  const noteX = offset + (inner - noteW) / 2
  const noteY = offset + (inner - noteH) / 2
  const noteR = inner * 0.08

  // 罫線とチェックマーク
  const lineX = noteX + noteW * 0.16
  const lineW = noteW * 0.68
  const lineH = Math.max(2, inner * 0.035)
  const lineGap = noteH * 0.18
  const firstLineY = noteY + noteH * 0.24

  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      const index = (py * size + px) * 4
      const note = roundRectCoverage(px, py, noteX, noteY, noteW, noteH, noteR)
      if (note > 0) blend(buf, index, PAPER, note)
    }
  }

  for (let row = 0; row < 3; row += 1) {
    const y = firstLineY + lineGap * row
    const width = row === 2 ? lineW * 0.6 : lineW
    for (let py = Math.floor(y); py < Math.ceil(y + lineH); py += 1) {
      for (let px = Math.floor(lineX); px < Math.ceil(lineX + width); px += 1) {
        const index = (py * size + px) * 4
        const cover = roundRectCoverage(px, py, lineX, y, width, lineH, lineH / 2)
        if (cover > 0) blend(buf, index, LINE, cover)
      }
    }
  }

  // 下のほうに「チェック」を表す小さな四角2つ（記録がたまっていくイメージ）
  const markSize = inner * 0.08
  const markY = firstLineY + lineGap * 2 + lineH * 3
  for (let i = 0; i < 2; i += 1) {
    const markX = lineX + i * markSize * 1.8
    for (let py = Math.floor(markY); py < Math.ceil(markY + markSize); py += 1) {
      for (let px = Math.floor(markX); px < Math.ceil(markX + markSize); px += 1) {
        const index = (py * size + px) * 4
        const cover = roundRectCoverage(px, py, markX, markY, markSize, markSize, markSize * 0.3)
        if (cover > 0) blend(buf, index, MARK, cover)
      }
    }
  }

  return encodePng(size, size, buf)
}

const targets = [
  { file: 'public/icon-192.png', size: 192, padding: 0.06 },
  { file: 'public/icon-512.png', size: 512, padding: 0.06 },
  // マスカブルは端が丸く切られるので、中身を内側に寄せる
  { file: 'public/icon-maskable-512.png', size: 512, padding: 0.16 },
]

for (const target of targets) {
  writeFileSync(target.file, drawIcon(target.size, target.padding))
  console.log(`wrote ${target.file}`)
}
