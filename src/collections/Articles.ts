import type { CollectionConfig } from 'payload'

export const Articles: CollectionConfig = {
  slug: 'articles',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'author', 'status', 'publishedAt', 'updatedAt'],
    group: 'Content',
  },
  versions: {
    maxPerDoc: 5,
    drafts: true,
  },
  access: {
    read: ({ req }) => {
      if (req.user && (req.user.roles === 'admin' || req.user.roles === 'moderator')) {
        return true
      }

      return {
        _status: {
          equals: 'published',
        },
      }
    },

    create: ({ req }) => {
      if (!req.user) return false
      return req.user.roles === 'admin' || req.user.roles === 'moderator'
    },

    update: ({ req }) => {
      if (!req.user) return false
      return req.user.roles === 'admin' || req.user.roles === 'moderator'
    },

    delete: ({ req }) => {
      if (!req.user) return false
      return req.user.roles === 'admin'
    },
  },

  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Article Title',
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
      name: 'excerpt',
      type: 'textarea',
      label: 'Excerpt',
      admin: {
        description: 'Short description for preview and SEO',
      },
    },
    {
      name: 'content',
      type: 'richText',
      required: true,
      label: 'Article Content',
    },
    {
      name: 'coverImage',
      type: 'upload',
      relationTo: 'media',
      label: 'Cover Image',
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      label: 'Author',
      admin: {
        description: 'Article author',
      },
    },
    {
      name: 'category',
      type: 'select',
      options: [
        { label: 'News', value: 'news' },
        { label: 'Tutorial', value: 'tutorial' },
        { label: 'Guide', value: 'guide' },
        { label: 'Update', value: 'update' },
        { label: 'Event', value: 'event' },
        { label: 'Announcement', value: 'announcement' },
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
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      label: 'Featured Article',
      admin: {
        description: 'Show this article in featured section',
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
  ],
  timestamps: true,
}
