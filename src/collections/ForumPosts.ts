import type { CollectionConfig } from 'payload'

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
    // Anyone can read published posts
    read: ({ req }) => {
      // If user is admin or moderator, show all posts
      if (req.user && (req.user.roles === 'admin' || req.user.roles === 'moderator')) {
        return true
      }
      // Otherwise only show published posts
      return {
        status: {
          equals: 'published',
        },
      }
    },
    // Any authenticated user can create
    create: ({ req }) => {
      return !!req.user
    },
    // Users can update their own posts, admins/moderators can update any
    update: ({ req }) => {
      if (!req.user) return false
      if (req.user.roles === 'admin' || req.user.roles === 'moderator') {
        return true
      }
      // Users can only update their own posts
      return {
        author: {
          equals: req.user.id,
        },
      }
    },
    // Users can delete their own posts, admins can delete any
    delete: ({ req }) => {
      if (!req.user) return false
      if (req.user.roles === 'admin' || req.user.roles === 'moderator') {
        return true
      }
      return {
        author: {
          equals: req.user.id,
        },
      }
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
        description: 'Only admins/moderators can pin posts',
        condition: (data, siblingData, { user }) =>
          user?.roles === 'admin' || user?.roles === 'moderator',
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
