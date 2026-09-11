// 保存されている写真を表示する部品。
// 画像データはデータベースの中にあるので、取り出して一時的なURLに変えて表示する。

import { useEffect, useState } from 'react'
import { store } from '../lib/storage'

export function PhotoImage({
  photoId,
  alt,
  onClick,
}: {
  photoId: string
  alt: string
  onClick?: () => void
}) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false

    store
      .getPhoto(photoId)
      .then((blob) => {
        if (!blob || cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })
      .catch(() => setUrl(null))

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [photoId])

  if (!url) return <div className="photo photo-empty" aria-label="読み込み中" />

  return (
    <img
      className="photo"
      src={url}
      alt={alt}
      onClick={onClick}
      style={onClick ? { cursor: 'zoom-in' } : undefined}
    />
  )
}
