import type { GlobalConfig } from 'payload'

export const PrivacyPage: GlobalConfig = {
  slug: 'privacy-page',
  admin: {
    group: 'Content',
  },
  access: {
    read: () => true,
    update: ({ req }) => req.user?.roles === 'admin',
  },
  fields: [
    {
      name: 'lastUpdated',
      type: 'text',
      localized: true,
      label: 'Last Updated Date',
      defaultValue: 'March 2026',
    },
    {
      name: 'sections',
      type: 'array',
      localized: true,
      label: 'Sections',
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
          label: 'Section Title',
        },
        {
          name: 'content',
          type: 'textarea',
          required: true,
          label: 'Section Content',
        },
      ],
    },
  ],
}
