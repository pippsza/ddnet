import type { CollectionConfig } from 'payload'
import { hasPermission, hasPageAccess } from '@/lib/permissions'

/**
 * Forum Posts Collection
 * Community forum posts that anyone can create
 */
export const ForumPosts: CollectionConfig = {
  slug: 'forum-posts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'author', 'category', 'status', 'createdAt'],
    group: 'Community',
  },
  access: {
    read: async ({ req }) => {
      if (req.user && !(await hasPageAccess(req, 'forum'))) return false
      if (req.user && (await hasPermission(req, 'forum', 'view_hidden'))) {
        return true
      }
      return { status: { equals: 'published' } }
    },
    create: async ({ req }) => {
      if (!req.user) return false
      return hasPageAccess(req, 'forum')
    },
    update: async ({ req }) => {
      if (!req.user) return false
      if (!(await hasPageAccess(req, 'forum'))) return false
      if (await hasPermission(req, 'forum', 'edit_any')) return true
      return { author: { equals: req.user.id } }
    },
    delete: async ({ req }) => {
      if (!req.user) return false
      if (!(await hasPageAccess(req, 'forum'))) return false
      if (await hasPermission(req, 'forum', 'delete_any')) return true
      return { author: { equals: req.user.id } }
    },
  },

  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Post Title',
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      label: 'URL Slug',
      admin: {
        description: 'URL-friendly version of the title',
      },
    },
    {
      name: 'content',
      type: 'richText',
      required: true,
      label: 'Post Content',
    },
    {
      name: 'images',
      type: 'array',
      label: 'Images',
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
      ],
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      label: 'Author',
      admin: {
        description: 'Post author',
      },
    },
    {
      name: 'category',
      type: 'select',
      required: true,
      options: [
        { label: 'General Discussion', value: 'general' },
        { label: 'Questions & Help', value: 'help' },
        { label: 'Suggestions', value: 'suggestions' },
        { label: 'Bug Reports', value: 'bugs' },
        { label: 'Map Showcase', value: 'maps' },
        { label: 'Clan Recruitment', value: 'clans' },
        { label: 'Off Topic', value: 'offtopic' },
      ],
      label: 'Category',
    },
    {
      name: 'tags',
      type: 'array',
      label: 'Tags',
      fields: [
        {
          name: 'tag',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      options: [
        { label: 'Published', value: 'published' },
        { label: 'Hidden', value: 'hidden' },
        { label: 'Locked', value: 'locked' },
      ],
      defaultValue: 'published',
      label: 'Status',
      admin: {
        description: 'Locked posts cannot be edited or have new replies',
      },
    },
    {
      name: 'isPinned',
      type: 'checkbox',
      defaultValue: false,
      label: 'Pinned Post',
      admin: {
        description: 'Only staff with forum.pin permission can pin posts',
        condition: (data, siblingData, { user }) =>
          user?.roles === 'admin' || (Array.isArray((user as any)?.assignedRoles) && (user as any).assignedRoles.length > 0),
      },
    },
    {
      name: 'views',
      type: 'number',
      defaultValue: 0,
      min: 0,
      label: 'View Count',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'likes',
      type: 'number',
      defaultValue: 0,
      min: 0,
      label: 'Likes',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'replies',
      type: 'array',
      label: 'Replies',
      fields: [
        {
          name: 'author',
          type: 'relationship',
          relationTo: 'users',
          required: true,
          label: 'Reply Author',
        },
        {
          name: 'content',
          type: 'richText',
          required: true,
          label: 'Reply Content',
        },
        {
          name: 'createdAt',
          type: 'date',
          required: true,
          defaultValue: () => new Date().toISOString(),
          label: 'Reply Date',
          admin: {
            readOnly: true,
          },
        },
        {
          name: 'images',
          type: 'array',
          fields: [
            {
              name: 'image',
              type: 'upload',
              relationTo: 'media',
              required: true,
            },
          ],
        },
        {
          name: 'likes',
          type: 'number',
          defaultValue: 0,
          min: 0,
          label: 'Reply Likes',
          admin: {
            readOnly: true,
          },
        },
      ],
    },
  ],
  timestamps: true,
}
