'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { X, Loader2, FileIcon, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export interface UploadedFile {
  id: string
  url: string
  filename: string
  mimeType: string
}

function isImageMime(mime: string) {
  return mime.startsWith('image/')
}

async function uploadFile(file: File): Promise<UploadedFile> {
  const form = new FormData()
  form.append('file', file)
  form.append('alt', file.name)
  const res = await fetch('/api/media', { method: 'POST', body: form })
  if (!res.ok) throw new Error('Upload failed')
  const data = await res.json()
  return {
    id: data.doc.id,
    url: data.doc.url,
    filename: data.doc.filename || file.name,
    mimeType: data.doc.mimeType || file.type,
  }
}

interface MediaAttachmentsProps {
  files: UploadedFile[]
  onFilesChange: (files: UploadedFile[]) => void
  maxFiles?: number
}

export function MediaAttachments({ files, onFilesChange, maxFiles = 5 }: MediaAttachmentsProps) {
  const [uploading, setUploading] = useState(false)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const remaining = maxFiles - files.length
    if (remaining <= 0) {
      toast.error(`Maximum ${maxFiles} files allowed`)
      return
    }

    const toUpload = acceptedFiles.slice(0, remaining)
    setUploading(true)
    try {
      const uploaded = await Promise.all(toUpload.map(uploadFile))
      onFilesChange([...files, ...uploaded])
    } catch {
      toast.error('Failed to upload file(s)')
    } finally {
      setUploading(false)
    }
  }, [files, onFilesChange, maxFiles])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: uploading || files.length >= maxFiles,
    multiple: true,
  })

  const handleRemove = (id: string) => {
    onFilesChange(files.filter((f) => f.id !== id))
  }

  return (
    <div className="space-y-2">
      {files.length < maxFiles && (
        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors',
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50',
            (uploading || files.length >= maxFiles) && 'opacity-50 cursor-not-allowed',
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
            <Upload className="h-5 w-5" />
            {isDragActive ? (
              <p className="text-sm">Drop files here</p>
            ) : (
              <p className="text-sm">Drag & drop files here or click to browse</p>
            )}
          </div>
        </div>
      )}

      {(files.length > 0 || uploading) && (
        <div className="flex flex-wrap gap-2">
          {files.map((f) => (
            <div key={f.id} className="relative group">
              {isImageMime(f.mimeType) ? (
                <img
                  src={f.url}
                  alt={f.filename}
                  className="h-16 w-16 object-cover rounded-md border"
                />
              ) : (
                <div className="h-16 px-3 flex items-center gap-2 rounded-md border bg-muted/50">
                  <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground truncate max-w-24">{f.filename}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => handleRemove(f.id)}
                className="absolute -top-1.5 -right-1.5 rounded-full bg-destructive text-destructive-foreground p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {uploading && (
            <div className="h-16 w-16 rounded-md border flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
