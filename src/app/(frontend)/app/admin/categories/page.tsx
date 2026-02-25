'use client'

import { useState, useRef } from 'react'
import useSWR from 'swr'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { CardListSkeleton } from '@/components/ui/page-skeleton'
import { Plus, Trash2, X, Pencil, Loader2 } from 'lucide-react'
import { CategoryIcon, ICON_MAP } from '@/components/bingo/CategoryIcon'
import { AVAILABLE_CATEGORY_ICONS } from '@/lib/ddnet-constants'
import { cn } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface ValidatedMap {
  mapName: string
  difficulty?: number
  points?: number
  type?: string
}

interface CustomCategory {
  id?: string
  name: string
  slug: string
  description?: string
  icon?: string
  maps: ValidatedMap[]
}

function slugify(name: string): string {
  return (
    'custom_' +
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  )
}

export default function AdminCategoriesPage() {
  const { data, isLoading, mutate } = useSWR('/api/globals/custom-categories', fetcher)
  const categories: CustomCategory[] = data?.categories || []

  const [createOpen, setCreateOpen] = useState(false)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('')
  const [maps, setMaps] = useState<ValidatedMap[]>([])
  const [mapInput, setMapInput] = useState('')
  const [validating, setValidating] = useState(false)
  const [error, setError] = useState('')
  const mapInputRef = useRef<HTMLInputElement>(null)

  const resetForm = () => {
    setName('')
    setDescription('')
    setIcon('')
    setMaps([])
    setMapInput('')
    setError('')
  }

  const openEdit = (index: number) => {
    const cat = categories[index]
    setName(cat.name)
    setDescription(cat.description || '')
    setIcon(cat.icon || '')
    setMaps([...cat.maps])
    setMapInput('')
    setError('')
    setEditIndex(index)
  }

  const validateAndAddMap = async () => {
    const trimmed = mapInput.trim()
    if (!trimmed) return

    // Check if already added
    if (maps.some((m) => m.mapName.toLowerCase() === trimmed.toLowerCase())) {
      setError('Map already added')
      return
    }

    setValidating(true)
    setError('')
    try {
      const res = await fetch('/api/admin/validate-maps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maps: [trimmed] }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Validation failed')
      }
      const data = await res.json()
      const result = data.results[0]

      if (result.valid) {
        setMaps((prev) => [
          ...prev,
          {
            mapName: result.name,
            difficulty: result.difficulty,
            points: result.points,
            type: result.type,
          },
        ])
        setMapInput('')
      } else {
        setError(`Map "${trimmed}" not found on DDNet`)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Validation failed')
    } finally {
      setValidating(false)
      requestAnimationFrame(() => mapInputRef.current?.focus())
    }
  }

  const removeMap = (index: number) => {
    setMaps((prev) => prev.filter((_, i) => i !== index))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      validateAndAddMap()
    }
  }

  const saveCategory = async () => {
    if (!name.trim()) return
    if (maps.length < 9) {
      setError('At least 9 maps required (minimum for 3x3 bingo grid)')
      return
    }

    setSaving(true)
    setError('')
    try {
      const newCat: CustomCategory = {
        name: name.trim(),
        slug: editIndex !== null ? categories[editIndex].slug : slugify(name.trim()),
        description: description.trim() || undefined,
        icon: icon || undefined,
        maps,
      }

      let updated: CustomCategory[]
      if (editIndex !== null) {
        updated = categories.map((c, i) =>
          i === editIndex ? { ...c, ...newCat, slug: c.slug } : c,
        )
      } else {
        if (categories.some((c) => c.slug === newCat.slug)) {
          setError(`Category with slug "${newCat.slug}" already exists`)
          setSaving(false)
          return
        }
        updated = [...categories, newCat]
      }

      const res = await fetch('/api/globals/custom-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: updated }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.errors?.[0]?.message || 'Failed to save')
      }

      await mutate()
      setCreateOpen(false)
      setEditIndex(null)
      resetForm()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const deleteCategory = async (index: number) => {
    if (!confirm(`Delete category "${categories[index].name}"? This cannot be undone.`)) return

    setSaving(true)
    try {
      const updated = categories.filter((_, i) => i !== index)
      await fetch('/api/globals/custom-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: updated }),
      })
      await mutate()
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) return <CardListSkeleton />

  const categoryForm = (
    <div className="space-y-4">
      <div>
        <Label htmlFor="cat-name">Category Name</Label>
        <Input
          id="cat-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="EmpaTee Picks"
        />
        {name && editIndex === null && (
          <p className="text-xs text-muted-foreground mt-1">Slug: {slugify(name)}</p>
        )}
      </div>

      <div>
        <Label htmlFor="cat-desc">Description (optional)</Label>
        <Input
          id="cat-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="A curated selection of maps"
        />
      </div>

      {/* Icon picker */}
      <div>
        <Label>Icon</Label>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {AVAILABLE_CATEGORY_ICONS.map((iconName) => {
            const IconComp = ICON_MAP[iconName]
            if (!IconComp) return null
            return (
              <button
                key={iconName}
                type="button"
                onClick={() => setIcon(icon === iconName ? '' : iconName)}
                className={cn(
                  'flex items-center justify-center h-8 w-8 rounded-md border transition-colors',
                  icon === iconName
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-transparent hover:bg-muted text-muted-foreground',
                )}
                title={iconName}
              >
                <IconComp className="h-4 w-4" />
              </button>
            )
          })}
        </div>
        {icon && (
          <p className="text-xs text-muted-foreground mt-1">Selected: {icon}</p>
        )}
      </div>

      <div>
        <Label>Maps</Label>
        <div className="flex gap-2">
          <Input
            ref={mapInputRef}
            value={mapInput}
            onChange={(e) => {
              setMapInput(e.target.value)
              setError('')
            }}
            onKeyDown={handleKeyDown}
            placeholder="Enter map name..."
            disabled={validating}
          />
          <Button
            type="button"
            onClick={validateAndAddMap}
            disabled={validating || !mapInput.trim()}
            variant="outline"
            className="shrink-0"
          >
            {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
          </Button>
        </div>
        {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
      </div>

      {maps.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">
            {maps.length} map(s)
            {maps.length < 9 && ` — need at least 9`}
            {maps.length >= 9 && maps.length < 25 && ' — enough for 3x3'}
            {maps.length >= 25 && maps.length < 49 && ' — enough for 5x5'}
            {maps.length >= 49 && ' — enough for 7x7'}
          </p>
          <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
            {maps.map((m, i) => (
              <Badge
                key={m.mapName}
                variant="secondary"
                className="gap-1 pl-2 pr-1 py-1 text-xs"
              >
                <span>{m.mapName}</span>
                <span className="text-muted-foreground">
                  {m.type} {m.difficulty}★
                </span>
                <button
                  type="button"
                  onClick={() => removeMap(i)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      <Button
        onClick={saveCategory}
        disabled={saving || maps.length < 9 || !name.trim()}
        className="w-full"
      >
        {saving ? 'Saving...' : editIndex !== null ? 'Update Category' : 'Create Category'}
      </Button>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Custom Categories</h1>
        <Dialog
          open={createOpen}
          onOpenChange={(open) => {
            setCreateOpen(open)
            if (!open) resetForm()
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Category
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Custom Category</DialogTitle>
            </DialogHeader>
            {categoryForm}
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit dialog */}
      <Dialog
        open={editIndex !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditIndex(null)
            resetForm()
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          {categoryForm}
        </DialogContent>
      </Dialog>

      <div className="grid gap-4">
        {categories.map((cat, index) => (
          <Card key={cat.slug}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="min-w-0 flex-1 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <CategoryIcon iconName={cat.icon} className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{cat.name}</h3>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {cat.slug}
                    </Badge>
                  </div>
                  {cat.description && (
                    <p className="text-sm text-muted-foreground mt-0.5">{cat.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {cat.maps?.length || 0} maps
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <Button variant="outline" size="sm" onClick={() => openEdit(index)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteCategory(index)}
                  disabled={saving}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {categories.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No custom categories yet. Create one to get started.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
