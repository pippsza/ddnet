import type { CollectionConfig } from 'payload'

export const Bots: CollectionConfig = {
  slug: 'bots',
  admin: {
    useAsTitle: 'name',
    group: 'System',
    defaultColumns: ['name', 'mode', 'status', 'startedAt'],
    description: 'Manage running bot instances',
  },
  access: {
    read: ({ req }) => {
      if (!req.user) return false
      return req.user.roles === 'admin'
    },
    create: ({ req }) => {
      if (!req.user) return false
      return req.user.roles === 'admin'
    },
    update: ({ req }) => {
      if (!req.user) return false
      return req.user.roles === 'admin'
    },
    delete: ({ req }) => {
      if (!req.user) return false
      return req.user.roles === 'admin'
    },
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Bot Name',
      admin: {
        description: 'Human-readable name for this bot instance',
      },
    },
    {
      name: 'containerId',
      type: 'text',
      required: true,
      unique: true,
      label: 'Docker Container ID',
      admin: {
        description: 'Docker container ID for this bot',
      },
    },
    {
      name: 'mode',
      type: 'select',
      required: true,
      options: [
        { label: 'Verification', value: 'verification' },
        { label: 'Race', value: 'race' },
        { label: 'Chat', value: 'chat' },
        { label: 'Monitor', value: 'monitor' },
      ],
      admin: {
        description: 'The mode this bot is running in',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      options: [
        { label: 'Starting', value: 'starting' },
        { label: 'Running', value: 'running' },
        { label: 'Stopping', value: 'stopping' },
        { label: 'Stopped', value: 'stopped' },
        { label: 'Error', value: 'error' },
      ],
      defaultValue: 'starting',
      admin: {
        description: 'Current status of the bot',
      },
    },
    {
      name: 'connectedServer',
      type: 'group',
      label: 'Connected Server',
      admin: {
        description: 'The server this bot is connected to',
      },
      fields: [
        {
          name: 'ip',
          type: 'text',
          label: 'IP Address',
        },
        {
          name: 'port',
          type: 'number',
          label: 'Port',
          defaultValue: 8303,
        },
        {
          name: 'name',
          type: 'text',
          label: 'Server Name',
        },
      ],
    },
    {
      name: 'linkedGame',
      type: 'relationship',
      relationTo: ['bingo', 'races'],
      label: 'Linked Game',
      admin: {
        description: 'The game this bot is associated with (if any)',
      },
    },
    {
      name: 'linkedUser',
      type: 'relationship',
      relationTo: 'users',
      label: 'Linked User',
      admin: {
        description: 'The user who initiated this bot (if any)',
      },
    },
    {
      name: 'logs',
      type: 'array',
      label: 'Bot Logs',
      admin: {
        description: 'Recent log entries from the bot',
      },
      fields: [
        {
          name: 'timestamp',
          type: 'date',
          required: true,
          admin: {
            date: {
              pickerAppearance: 'dayAndTime',
            },
          },
        },
        {
          name: 'level',
          type: 'select',
          options: [
            { label: 'Info', value: 'info' },
            { label: 'Warning', value: 'warn' },
            { label: 'Error', value: 'error' },
          ],
          defaultValue: 'info',
        },
        {
          name: 'message',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'startedAt',
      type: 'date',
      label: 'Started At',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'stoppedAt',
      type: 'date',
      label: 'Stopped At',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'metadata',
      type: 'json',
      label: 'Additional Metadata',
      admin: {
        description: 'Additional data specific to the bot mode',
      },
    },
  ],
}
