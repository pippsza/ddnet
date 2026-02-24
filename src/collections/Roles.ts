import type { CollectionConfig } from 'payload'
import { invalidateRoleCache } from '@/lib/permissions'

export const Roles: CollectionConfig = {
  slug: 'roles',
  admin: {
    useAsTitle: 'name',
    group: 'System',
    defaultColumns: ['name', 'displayName', 'priority', 'createdAt'],
  },
  access: {
    read: () => true,
    create: ({ req }) => req.user?.roles === 'admin',
    update: ({ req }) => req.user?.roles === 'admin',
    delete: ({ req }) => req.user?.roles === 'admin',
  },
  hooks: {
    afterChange: [() => invalidateRoleCache()],
    afterDelete: [() => invalidateRoleCache()],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Unique identifier (e.g., "moderator", "tester", "editor")',
      },
    },
    {
      name: 'displayName',
      type: 'text',
      required: true,
      admin: {
        description: 'Human-readable name shown in badges (e.g., "Moderator", "Tester")',
      },
    },
    {
      name: 'priority',
      type: 'number',
      required: true,
      defaultValue: 0,
      admin: {
        description: 'Higher = more important. Highest priority role is shown as the badge.',
      },
    },
    {
      name: 'badgeColor',
      type: 'text',
      required: true,
      defaultValue: '#6b7280',
      admin: {
        description: 'CSS hex color for badge background (e.g., "#3b82f6")',
      },
    },
    {
      name: 'textColor',
      type: 'text',
      required: true,
      defaultValue: '#ffffff',
      admin: {
        description: 'CSS hex color for badge text (e.g., "#ffffff")',
      },
    },
    {
      name: 'permissions',
      type: 'group',
      fields: [
        {
          name: 'articles',
          type: 'select',
          hasMany: true,
          options: [
            { label: 'Create Articles', value: 'create' },
            { label: 'Edit Articles', value: 'edit' },
            { label: 'Delete Articles', value: 'delete' },
            { label: 'View Drafts', value: 'view_drafts' },
          ],
        },
        {
          name: 'support',
          type: 'select',
          hasMany: true,
          options: [
            { label: 'View All Tickets', value: 'view_all' },
            { label: 'Reply to Tickets', value: 'reply' },
            { label: 'Change Ticket Status', value: 'change_status' },
            { label: 'Delete Tickets', value: 'delete' },
          ],
        },
        {
          name: 'forum',
          type: 'select',
          hasMany: true,
          options: [
            { label: 'View Hidden Posts', value: 'view_hidden' },
            { label: 'Edit Any Post', value: 'edit_any' },
            { label: 'Delete Any Post', value: 'delete_any' },
            { label: 'Pin Posts', value: 'pin' },
            { label: 'Lock Posts', value: 'lock' },
          ],
        },
        {
          name: 'games',
          type: 'select',
          hasMany: true,
          options: [
            { label: 'Edit Any Game', value: 'edit_any' },
            { label: 'Delete Any Game', value: 'delete_any' },
            { label: 'Manage Categories', value: 'manage_categories' },
          ],
        },
        {
          name: 'adminPages',
          type: 'select',
          hasMany: true,
          options: [
            { label: 'Bot Management', value: 'bots' },
            { label: 'Container Test', value: 'container_test' },
            { label: 'Send Notifications', value: 'notifications' },
            { label: 'Debug Tools', value: 'debug' },
            { label: 'Categories', value: 'categories' },
            { label: 'Tickets', value: 'tickets' },
            { label: 'Stats', value: 'stats' },
            { label: 'Role Management', value: 'roles' },
          ],
        },
      ],
    },
  ],
}
