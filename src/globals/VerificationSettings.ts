import type { GlobalConfig } from 'payload'

export const VerificationSettings: GlobalConfig = {
  slug: 'verification-settings',
  admin: {
    group: 'Verification',
  },
  access: {
    read: ({ req }) => req.user?.roles === 'admin',
    update: ({ req }) => req.user?.roles === 'admin',
  },
  fields: [
    {
      name: 'servers',
      type: 'array',
      required: true,
      minRows: 1,
      label: 'Verification Servers',
      admin: {
        description: 'Servers where /verify command is available',
      },
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
          label: 'Server Name',
          admin: {
            description: 'Human-readable name (e.g., "GER Verify #1")',
          },
        },
        {
          name: 'ip',
          type: 'text',
          required: true,
          label: 'IP Address',
        },
        {
          name: 'port',
          type: 'number',
          required: true,
          min: 1,
          max: 65535,
          defaultValue: 8303,
          label: 'Port',
        },
        {
          name: 'region',
          type: 'text',
          label: 'Region',
          admin: {
            description: 'Server region (e.g., EU, NA, AS)',
          },
        },
      ],
    },
    {
      name: 'maxConcurrentBots',
      type: 'number',
      defaultValue: 4,
      min: 1,
      max: 20,
      label: 'Max Concurrent Bots',
      admin: {
        description: 'Maximum number of verification bots running simultaneously',
      },
    },
    {
      name: 'verificationTtlMs',
      type: 'number',
      defaultValue: 600000,
      label: 'Verification TTL (ms)',
      admin: {
        description: 'How long a verification request stays valid (default: 10 minutes)',
      },
    },
  ],
}
