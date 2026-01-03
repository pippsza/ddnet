import type { CollectionConfig } from 'payload'

export const Servers: CollectionConfig = {
  slug: 'servers',
  admin: {
    useAsTitle: 'name',
    group: 'Verification',
    defaultColumns: ['name', 'ip', 'port', 'isActive', 'region'],
  },
  access: {
    read: () => true,
    create: ({ req }) => req.user?.roles === 'admin',
    update: ({ req }) => req.user?.roles === 'admin',
    delete: ({ req }) => req.user?.roles === 'admin',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Server Name',
      admin: {
        description: 'Human-readable name for the server',
      },
    },
    {
      name: 'ip',
      type: 'text',
      required: true,
      label: 'IP Address',
      admin: {
        description: 'Server IP address (e.g., 127.0.0.1)',
      },
    },
    {
      name: 'port',
      type: 'number',
      required: true,
      min: 1,
      max: 65535,
      defaultValue: 8303,
      label: 'Port',
      admin: {
        description: 'Server port (default: 8303)',
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      label: 'Active',
      admin: {
        description: 'Whether this server should be included in bot searches',
      },
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
}
