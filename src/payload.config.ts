import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
// import { cloudinaryStorage } from 'payload-storage-cloudinary'
import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Bingo } from './collections/bingo'
import { Races } from './collections/Races'
import { Bots } from './collections/Bots'
import { Notifications } from './collections/Notifications'
import { FriendRequests } from './collections/FriendRequests'
import { Articles } from './collections/Articles'
import { ForumPosts } from './collections/ForumPosts'
import { Support } from './collections/Support'
import { VerificationRequests } from './collections/VerificationRequests'
import { VerificationSettings } from './globals/VerificationSettings'
import { ChatSessions } from './collections/ChatSessions'
import { PushSubscriptions } from './collections/PushSubscriptions'
import { Conversations } from './collections/Conversations'
import { Messages } from './collections/Messages'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [
    Users,
    Media,
    Bingo,
    Races,
    Bots,
    Notifications,
    FriendRequests,
    Articles,
    ForumPosts,
    Support,
    VerificationRequests,
    ChatSessions,
    PushSubscriptions,
    Conversations,
    Messages,
  ],
  globals: [VerificationSettings],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: mongooseAdapter({
    url: process.env.DATABASE_URI || '',
  }),
  sharp,
  plugins: [
    // Cloudinary storage disabled — using local file storage instead
    // cloudinaryStorage({
    //   cloudConfig: {
    //     cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    //     api_key: process.env.CLOUDINARY_API_KEY,
    //     api_secret: process.env.CLOUDINARY_API_SECRET,
    //   },
    //   collections: {
    //     media: true,
    //   },
    // }),
  ],
})
