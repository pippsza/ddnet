import type { GlobalConfig } from 'payload'

export const CustomCategories: GlobalConfig = {
  slug: 'custom-categories',
  label: 'Custom Categories',
  admin: {
    group: 'Games',
  },
  access: {
    read: () => true,
    update: ({ req }) => {
      if (!req.user) return false
      return req.user.roles === 'admin' || req.user.roles === 'moderator'
    },
  },
  fields: [
    {
      name: 'categories',
      type: 'array',
      label: 'Custom Categories',
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
          label: 'Category Name',
          admin: {
            description: 'Human-readable name (e.g., "EmpaTee Picks")',
          },
        },
        {
          name: 'slug',
          type: 'text',
          required: true,
          label: 'Slug',
          admin: {
            description: 'URL-safe identifier, must start with "custom_" (e.g., "custom_empatee-picks")',
          },
          validate: (value: string | undefined | null) => {
            if (!value) return 'Slug is required'
            if (!value.startsWith('custom_')) return 'Slug must start with "custom_"'
            if (!/^custom_[a-z0-9-]+$/.test(value))
              return 'Slug must be lowercase alphanumeric with hyphens (e.g., "custom_my-pack")'
            return true
          },
        },
        {
          name: 'description',
          type: 'textarea',
          label: 'Description',
        },
        {
          name: 'createdBy',
          type: 'relationship',
          relationTo: 'users',
          admin: { readOnly: true },
        },
        {
          name: 'maps',
          type: 'array',
          required: true,
          minRows: 1,
          label: 'Maps',
          fields: [
            {
              name: 'mapName',
              type: 'text',
              required: true,
              label: 'Map Name',
            },
            {
              name: 'difficulty',
              type: 'number',
              min: 0,
              max: 5,
              label: 'Difficulty (stars)',
              admin: { readOnly: true, description: 'Auto-fetched from DDNet API' },
            },
            {
              name: 'points',
              type: 'number',
              min: 0,
              label: 'Points',
              admin: { readOnly: true, description: 'Auto-fetched from DDNet API' },
            },
            {
              name: 'type',
              type: 'text',
              label: 'Original DDNet Category',
              admin: { readOnly: true, description: 'The DDNet category this map belongs to' },
            },
          ],
        },
      ],
    },
  ],
}
