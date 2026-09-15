// 写真はそのままだと1枚数MBになるので、保存する前に小さくする。
// カメラで撮った写真も、アルバムから選んだ写真も、同じこの処理を通す。

const MAX_EDGE = 1280
const QUALITY = 0.8

/** この形式なら、縮小できなくてもそのまま画面に出せる */
const DISPLAYABLE = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('画像を読み込めませんでした'))
    img.src = url
  })
}

/**
 * 長辺を MAX_EDGE に収めた JPEG に変換する。
 * この端末が読めない形式（iPhone の HEIC など）のときは null を返す。
 */
export async function shrinkImage(file: File): Promise<Blob | null> {
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
    if (!ctx) return null
    ctx.drawImage(img, 0, 0, width, height)

    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', QUALITY)
    })
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** 縮小できなかった写真を、そのまま保存してよいか */
export function canShowAsIs(file: File): boolean {
  return DISPLAYABLE.includes(file.type)
}
