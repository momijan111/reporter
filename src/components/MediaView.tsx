// 保存されている写真・動画を表示する部品。
// データ本体はデータベースの中にあるので、取り出して一時的なURLに変えて表示する。

import { useEffect, useState } from 'react'
import { store } from '../lib/storage'
import type { MediaRef } from '../types'

export function MediaView({
  item,
  full = false,
  onClick,
}: {
  item: MediaRef
  /** 拡大表示のときは true */
  full?: boolean
  onClick?: () => void
}) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false

    store
      .getMedia(item.id)
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
  }, [item.id])

  const className = full ? 'media media-full' : 'media'

  if (!url) return <div className={`${className} media-loading`} aria-label="読み込み中" />

  if (item.kind === 'video') {
    return (
      <video
        className={className}
        src={url}
        controls={full}
        muted={!full}
        playsInline
        preload="metadata"
        onClick={onClick}
      />
    )
  }

  return <img className={className} src={url} alt={item.name} onClick={onClick} />
}
