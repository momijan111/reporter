// 写真はそのままだと1枚数MBになるので、保存する前に小さくする。

const MAX_EDGE = 1280
const QUALITY = 0.8

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('画像を読み込めませんでした'))
    img.src = url
  })
}

/** 長辺を MAX_EDGE に収めた JPEG に変換する。失敗したら元のファイルをそのまま返す */
export async function shrinkImage(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height))
    const width = Math.round(img.width * scale)
    const height = Math.round(img.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(img, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', QUALITY)
    })
    return blob ?? file
  } catch {
    return file
  } finally {
    URL.revokeObjectURL(url)
  }
}
