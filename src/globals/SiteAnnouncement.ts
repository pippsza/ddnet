import type { GlobalConfig } from 'payload'

export const SiteAnnouncement: GlobalConfig = {
  slug: 'site-announcement',
  access: {
    read: ({ req }) => !!req.user,
    update: ({ req }) => req.user?.roles === 'admin',
  },
  hooks: {
    beforeChange: [
      ({ data, originalDoc }) => {
        // Generate new announcementId when message changes or enabled is toggled on
        const messageChanged = data.message !== originalDoc?.message
        const justEnabled = data.enabled && !originalDoc?.enabled
        if (messageChanged || justEnabled) {
          data.announcementId = Date.now().toString()
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'enabled',
      type: 'checkbox',
      defaultValue: false,
      label: 'Show Announcement',
    },
    {
      name: 'message',
      type: 'textarea',
      label: 'Announcement Message',
    },
    {
      name: 'announcementId',
      type: 'text',
      admin: {
        hidden: true,
      },
    },
  ],
}
