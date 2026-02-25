'use client'

import { useState, useCallback, useEffect } from 'react'
import { FileIcon, Download, X, ChevronLeft, ChevronRight } from 'lucide-react'

interface AttachmentItem {
  image: { url: string; filename?: string; mimeType?: string } | string
}

function isImage(mime?: string) {
  return mime?.startsWith('image/')
}

function ImageLightbox({
  images,
  index,
  onClose,
  onPrev,
  onNext,
}: {
  images: { url: string; filename?: string }[]
  index: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}) {
  const img = images[index]

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onPrev()
      if (e.key === 'ArrowRight') onNext()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose, onPrev, onNext])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 animate-in fade-in duration-150"
      onClick={onClose}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors z-10"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Prev */}
      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev() }}
          className="absolute left-4 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors z-10"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}

      {/* Next */}
      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext() }}
          className="absolute right-4 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors z-10"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      {/* Image */}
      <img
        src={img.url}
        alt={img.filename || 'image'}
        className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Counter */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm bg-black/50 px-3 py-1 rounded-full">
          {index + 1} / {images.length}
        </div>
      )}
    </div>
  )
}

export function MessageImages({ images }: { images?: AttachmentItem[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const imageItems = (images || [])
    .map((item) => (typeof item.image === 'object' && item.image?.url ? item.image : null))
    .filter((img): img is { url: string; filename?: string; mimeType?: string } => img !== null)

  const onlyImages = imageItems.filter((img) => isImage(img.mimeType))

  const openLightbox = useCallback((url: string) => {
    const idx = onlyImages.findIndex((img) => img.url === url)
    setLightboxIndex(idx >= 0 ? idx : 0)
  }, [onlyImages])

  const closeLightbox = useCallback(() => setLightboxIndex(null), [])

  const prevImage = useCallback(() => {
    setLightboxIndex((i) => (i !== null ? (i - 1 + onlyImages.length) % onlyImages.length : null))
  }, [onlyImages.length])

  const nextImage = useCallback(() => {
    setLightboxIndex((i) => (i !== null ? (i + 1) % onlyImages.length : null))
  }, [onlyImages.length])

  if (!images || images.length === 0) return null

  return (
    <>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {imageItems.map((img, i) => {
          if (isImage(img.mimeType)) {
            return (
              <button
                key={i}
                type="button"
                onClick={() => openLightbox(img.url)}
                className="cursor-zoom-in"
              >
                <img
                  src={img.url}
                  alt={img.filename || 'image'}
                  className="max-h-48 max-w-64 rounded-md object-cover border hover:opacity-90 transition-opacity"
                />
              </button>
            )
          }

          return (
            <a
              key={i}
              href={img.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-md border px-3 py-2 hover:bg-muted/50 transition-colors max-w-full overflow-hidden"
            >
              <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm truncate min-w-0 flex-1">{img.filename || 'file'}</span>
              <Download className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </a>
          )
        })}
      </div>

      {lightboxIndex !== null && onlyImages.length > 0 && (
        <ImageLightbox
          images={onlyImages}
          index={lightboxIndex}
          onClose={closeLightbox}
          onPrev={prevImage}
          onNext={nextImage}
        />
      )}
    </>
  )
}
