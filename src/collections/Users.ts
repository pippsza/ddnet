import type { CollectionConfig, PayloadRequest } from 'payload'

const adminAccessControl = ({ req }: { req: PayloadRequest }): boolean | Promise<boolean> => {
  const user = req.user
  if (!user) return false
  if (!user.roles) return false
  if (user && user?.roles.includes('admin')) {
    return true // Allow access
  }

  return false // Deny access for all other roles
}

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  access: {
    admin: adminAccessControl,
  },
  auth: true,
  fields: [
    {
      name: 'roles',
      type: 'select',
      required: true,
      options: ['admin', 'player', 'moderator'],
      defaultValue: 'player',
    },
    {
      name: 'friend',
      type: 'group',
      fields: [],
    },
    // Email added by default
    // Add more fields as needed
  ],
}
