import type { GlobalConfig } from 'payload'

export const RulesPage: GlobalConfig = {
  slug: 'rules-page',
  admin: {
    group: 'Content',
  },
  access: {
    read: () => true,
    update: ({ req }) => req.user?.roles === 'admin',
  },
  fields: [
    {
      name: 'sections',
      type: 'array',
      localized: true,
      label: 'Rule Sections',
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
