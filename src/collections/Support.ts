import type { CollectionConfig } from 'payload'
import { hasPermission } from '@/lib/permissions'

export const Support: CollectionConfig = {
  slug: 'support',
  admin: {
    useAsTitle: 'subject',
    defaultColumns: ['subject', 'category', 'status', 'priority', 'createdBy', 'createdAt'],
    group: 'Support',
  },
  access: {
    read: async ({ req }) => {
      if (!req.user) return false
      if (await hasPermission(req, 'support', 'view_all')) return true
      return { createdBy: { equals: req.user.id } }
    },
    create: ({ req }) => !!req.user,
    update: async ({ req }) => {
      if (!req.user) return false
      return hasPermission(req, 'support', 'change_status')
    },
    delete: async ({ req }) => {
      if (!req.user) return false
      return hasPermission(req, 'support', 'delete')
    },
  },
  fields: [
    {
      name: 'subject',
      type: 'text',
      required: true,
      label: 'Subject',
      admin: {
        description: 'Brief description of the issue',
      },
    },
    {
      name: 'category',
      type: 'select',
      required: true,
      options: [
        { label: 'Name Change', value: 'name_change' },
        { label: 'Bug Report', value: 'bug_report' },
        { label: 'Nickname Conflict', value: 'nickname_conflict' },
        { label: 'Account Issues', value: 'account_issues' },
        { label: 'Game Statistics', value: 'game_statistics' },
        { label: 'Verification Request', value: 'verification_request' },
        { label: 'Other', value: 'other' },
      ],
      defaultValue: 'other',
      label: 'Category',
    },
    {
      name: 'priority',
      type: 'select',
      required: true,
      options: [
        { label: 'Low', value: 'low' },
        { label: 'Medium', value: 'medium' },
        { label: 'High', value: 'high' },
        { label: 'Critical', value: 'critical' },
      ],
      defaultValue: 'medium',
      label: 'Priority',
      admin: {
        description: 'Priority level of the ticket',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      options: [
        { label: 'Open', value: 'open' },
        { label: 'In Progress', value: 'in_progress' },
        { label: 'Waiting for User', value: 'waiting_for_user' },
        { label: 'Resolved', value: 'resolved' },
        { label: 'Closed', value: 'closed' },
        { label: 'Rejected', value: 'rejected' },
      ],
      defaultValue: 'open',
      label: 'Status',
    },
    {
      name: 'description',
      type: 'richText',
      required: true,
      label: 'Description',
      admin: {
        description: 'Detailed description of the issue',
      },
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      label: 'Created By',
      admin: {
        readOnly: true,
        description: 'User who created this ticket (empty for anonymous)',
      },
      hooks: {
        beforeChange: [
          ({ req, operation, value }) => {
            // Automatically set createdBy to current user on create
            if (operation === 'create' && req.user) {
              return req.user.id
            }
            return value
          },
        ],
      },
    },
    {
      name: 'contactEmail',
      type: 'email',
      label: 'Contact Email',
      admin: {
        description: 'Email for anonymous ticket submissions',
        condition: (data) => !data.createdBy,
      },
    },
    {
      name: 'responses',
      type: 'array',
      label: 'Responses',
      admin: {
        description: 'Communication thread between user and support',
      },
      fields: [
        {
          name: 'message',
          type: 'richText',
          required: true,
          label: 'Message',
        },
        {
          name: 'author',
          type: 'relationship',
          relationTo: 'users',
          required: true,
          label: 'Author',
          hooks: {
            beforeChange: [
              ({ req, operation, value }) => {
                // Automatically set author to current user
                if (req.user && !value) {
                  return req.user.id
                }
                return value
              },
            ],
          },
        },
        {
          name: 'isStaffResponse',
          type: 'checkbox',
          defaultValue: false,
          label: 'Staff Response',
          admin: {
            description: 'Response from admin or moderator',
          },
          hooks: {
            beforeChange: [
              async ({ req, value }) => {
                if (req.user && (await hasPermission(req, 'support', 'reply'))) {
                  return true
                }
                if (!req.user) return value
                return false
              },
            ],
          },
        },
        {
          name: 'timestamp',
          type: 'date',
          required: true,
          label: 'Timestamp',
          admin: {
            readOnly: true,
          },
          hooks: {
            beforeChange: [
              ({ operation, value }) => {
                if (operation === 'create' || !value) {
                  return new Date().toISOString()
                }
                return value
              },
            ],
          },
        },
      ],
      access: {
        read: async ({ req, doc }) => {
          if (!req.user) return false
          if (await hasPermission(req, 'support', 'view_all')) return true
          return doc?.createdBy === req.user.id
        },
        create: async ({ req, doc }) => {
          if (!req.user) return false
          if (await hasPermission(req, 'support', 'reply')) return true
          return doc?.createdBy === req.user.id
        },
      },
    },
    {
      name: 'attachments',
      type: 'array',
      label: 'Attachments',
      admin: {
        description: 'Files attached to this ticket (screenshots, logs, etc.)',
      },
      fields: [
        {
          name: 'file',
          type: 'upload',
          relationTo: 'media',
          required: true,
          label: 'File',
        },
        {
          name: 'description',
          type: 'text',
          label: 'Description',
        },
      ],
    },
    {
      name: 'metadata',
      type: 'group',
      label: 'Metadata',
      admin: {
        description: 'Additional information for specific ticket types',
      },
      fields: [
        {
          name: 'requestedName',
          type: 'text',
          label: 'Requested Name',
          admin: {
            description: 'For name change requests',
            condition: (data) => data.category === 'name_change',
          },
        },
        {
          name: 'conflictingUser',
          type: 'relationship',
          relationTo: 'users',
          label: 'Conflicting User',
          admin: {
            description: 'For nickname conflict tickets',
            condition: (data) => data.category === 'nickname_conflict',
          },
        },
      ],
    },
    {
      name: 'resolvedAt',
      type: 'date',
      label: 'Resolved At',
      admin: {
        readOnly: true,
        description: 'Timestamp when ticket was resolved',
      },
      hooks: {
        beforeChange: [
          ({ data, value, operation }) => {
            // Automatically set resolvedAt when status changes to resolved or closed
            if (
              operation === 'update' &&
              (data?.status === 'resolved' || data?.status === 'closed') &&
              !value
            ) {
              return new Date().toISOString()
            }
            return value
          },
        ],
      },
    },
    {
      name: 'resolutionNotes',
      type: 'textarea',
      label: 'Resolution Notes',
      admin: {
        description: 'Internal notes about how the ticket was resolved',
        condition: (data, siblingData, { user }) => {
          return user?.roles === 'admin' || (Array.isArray((user as any)?.assignedRoles) && (user as any).assignedRoles.length > 0)
        },
      },
      access: {
        read: async ({ req }) => {
          if (!req.user) return false
          return hasPermission(req, 'support', 'view_all')
        },
        update: async ({ req }) => {
          if (!req.user) return false
          return hasPermission(req, 'support', 'change_status')
        },
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ req, operation, data, originalDoc }) => {
        if (operation === 'update' && req.user) {
          const canManage = await hasPermission(req, 'support', 'change_status')
          if (!canManage) {
            return {
              ...originalDoc,
              responses: data.responses,
            }
          }
        }
        return data
      },
    ],
  },
}
