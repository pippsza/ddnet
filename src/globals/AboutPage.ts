import type { GlobalConfig } from 'payload'

export const AboutPage: GlobalConfig = {
  slug: 'about-page',
  admin: {
    group: 'Content',
  },
  access: {
    read: () => true,
    update: ({ req }) => req.user?.roles === 'admin',
  },
  fields: [
    {
      name: 'projectDescription',
      type: 'textarea',
      localized: true,
      label: 'Project Description',
      admin: {
        description: 'Short description shown at the top of the About page.',
      },
    },
    {
      name: 'teamSections',
      type: 'array',
      localized: true,
      label: 'Team Sections',
      admin: {
        description: 'Each section renders team members with a different visual preset.',
      },
      fields: [
        {
          name: 'sectionTitle',
          type: 'text',
          required: true,
          label: 'Section Title',
        },
        {
          name: 'preset',
          type: 'select',
          required: true,
          defaultValue: 'card',
          label: 'Render Preset',
          options: [
            { label: 'Hero — Large centered card with glow', value: 'hero' },
            { label: 'Spotlight — Horizontal card (avatar + info)', value: 'spotlight' },
            { label: 'Card — Grid of cards', value: 'card' },
            { label: 'Minimal — Compact inline list', value: 'minimal' },
          ],
        },
        {
          name: 'members',
          type: 'array',
          label: 'Members',
          fields: [
            {
              name: 'name',
              type: 'text',
              required: true,
              label: 'Display Name',
            },
            {
              name: 'skinName',
              type: 'text',
              label: 'DDNet Skin Name',
              admin: {
                description: 'Skin name from DDNet (e.g. "default", "brownbear")',
              },
            },
            {
              name: 'skinColorBody',
              type: 'number',
              label: 'Body Color (TW code)',
              admin: {
                description: 'Teeworlds color code for body. Leave empty for default.',
              },
            },
            {
              name: 'skinColorFeet',
              type: 'number',
              label: 'Feet Color (TW code)',
              admin: {
                description: 'Teeworlds color code for feet. Leave empty for default.',
              },
            },
            {
              name: 'title',
              type: 'text',
              label: 'Title / Role',
              admin: {
                description: 'Badge text (e.g. "Lead Developer", "Tester")',
              },
            },
            {
              name: 'titleColor',
              type: 'text',
              label: 'Title Badge Color',
              defaultValue: '#6b7280',
              admin: {
                description: 'Hex color for the title badge (e.g. #ef4444)',
              },
            },
            {
              name: 'description',
              type: 'textarea',
              label: 'Description / Contribution',
            },
            {
              name: 'links',
              type: 'array',
              label: 'Social Links',
              maxRows: 5,
              fields: [
                {
                  name: 'platform',
                  type: 'select',
                  required: true,
                  options: [
                    { label: 'Discord', value: 'discord' },
                    { label: 'Telegram', value: 'telegram' },
                    { label: 'GitHub', value: 'github' },
                    { label: 'Twitter / X', value: 'twitter' },
                    { label: 'DDNet Profile', value: 'ddnet' },
                  ],
                },
                {
                  name: 'value',
                  type: 'text',
                  required: true,
                  label: 'Username or URL',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'specialThanks',
      type: 'array',
      label: 'Special Thanks',
      admin: {
        description: 'Simple list of people to thank — name + skin avatar.',
      },
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
          label: 'Name',
        },
        {
          name: 'skinName',
          type: 'text',
          label: 'DDNet Skin Name',
        },
        {
          name: 'skinColorBody',
          type: 'number',
          label: 'Body Color (TW code)',
        },
        {
          name: 'skinColorFeet',
          type: 'number',
          label: 'Feet Color (TW code)',
        },
      ],
    },
    {
      name: 'supportSection',
      type: 'group',
      label: 'Support the Project',
      fields: [
        {
          name: 'enabled',
          type: 'checkbox',
          defaultValue: true,
          label: 'Show Support Section',
        },
        {
          name: 'title',
          type: 'text',
          localized: true,
          label: 'Section Title',
          defaultValue: 'Support the Project',
        },
        {
          name: 'description',
          type: 'textarea',
          localized: true,
          label: 'Description',
        },
        {
          name: 'donationUrl',
          type: 'text',
          label: 'Donation URL (optional)',
        },
      ],
    },
    {
      name: 'contact',
      type: 'group',
      label: 'Contact Section',
      fields: [
        {
          name: 'enabled',
          type: 'checkbox',
          defaultValue: true,
          label: 'Show Contact Section',
        },
        {
          name: 'title',
          type: 'text',
          localized: true,
          label: 'Section Title',
          defaultValue: 'Get in Touch',
        },
        {
          name: 'description',
          type: 'textarea',
          localized: true,
          label: 'Description',
        },
        {
          name: 'links',
          type: 'array',
          label: 'Contact Links',
          admin: {
            description: 'Contact methods (Discord, Telegram, GitHub, etc.)',
          },
          fields: [
            {
              name: 'platform',
              type: 'select',
              required: true,
              options: [
                { label: 'Discord', value: 'discord' },
                { label: 'Telegram', value: 'telegram' },
                { label: 'GitHub', value: 'github' },
                { label: 'Twitter / X', value: 'twitter' },
                { label: 'Email', value: 'email' },
              ],
            },
            {
              name: 'value',
              type: 'text',
              required: true,
              label: 'Username or URL',
            },
          ],
        },
      ],
    },
  ],
}
