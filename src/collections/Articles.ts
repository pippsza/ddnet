import type { CollectionConfig } from 'payload'
import { hasPermission } from '@/lib/permissions'

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
    read: async ({ req }) => {
      if (req.user && (await hasPermission(req, 'articles', 'view_drafts'))) {
        return true
      }
      return { _status: { equals: 'published' } }
    },

    create: async ({ req }) => {
      if (!req.user) return false
      return hasPermission(req, 'articles', 'create')
    },

    update: async ({ req }) => {
      if (!req.user) return false
      return hasPermission(req, 'articles', 'edit')
    },

    delete: async ({ req }) => {
      if (!req.user) return false
      return hasPermission(req, 'articles', 'delete')
    },
  },

  hooks: {
    afterChange: [
      async ({ doc, previousDoc, req }) => {
        const isNowPublished = doc._status === 'published'
        const wasPreviouslyPublished = previousDoc?._status === 'published'

        // Only notify when article first becomes published
        if (!isNowPublished || wasPreviouslyPublished) return

        try {
          const payload = req.payload
          const { sendPushToUser } = await import('@/lib/push-notifications')

          // Get all users in batches
          let page = 1
          let hasMore = true
          while (hasMore) {
            const { docs: users, hasNextPage } = await payload.find({
              collection: 'users',
              limit: 100,
              page,
              select: { username: true },
              overrideAccess: true,
            })

            const authorId = typeof doc.author === 'string' ? doc.author : doc.author?.id

            await Promise.allSettled(
              users
                .filter((u) => u.id !== authorId)
                .map((user) =>
                  payload.create({
                    collection: 'notifications',
                    data: {
                      recipient: user.id,
                      type: 'system',
                      title: 'New Article',
                      message: doc.title,
                      actionUrl: `/app/articles/${doc.slug}`,
                    },
                    overrideAccess: true,
                  }).then(() => sendPushToUser(user.id, {
                    title: 'New Article',
                    body: doc.title,
                    url: `/app/articles/${doc.slug}`,
                  })),
                ),
            )

            hasMore = hasNextPage
            page++
          }
        } catch (error) {
          console.error('[Articles] Error sending notifications:', error)
        }
      },
    ],
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
