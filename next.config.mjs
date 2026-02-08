import { withPayload } from '@payloadcms/next/withPayload'
import createNextIntlPlugin from 'next-intl/plugin'
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Externalize dockerode and its native dependencies for server-side only
  serverExternalPackages: ['dockerode', 'ssh2', 'cpu-features', 'sqlite3', 'better-sqlite3'],
  // Your Next.js config here
  webpack: (webpackConfig, { isServer }) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    // Externalize native modules on server
    if (isServer) {
      webpackConfig.externals = webpackConfig.externals || []
      webpackConfig.externals.push('dockerode', 'ssh2', 'cpu-features', 'sqlite3', 'better-sqlite3')
    }

    return webpackConfig
  },
}
const withNextIntl = createNextIntlPlugin()
export default withPayload(withNextIntl(nextConfig), { devBundleServerPackages: false })
