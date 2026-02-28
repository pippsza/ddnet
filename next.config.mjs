import { withPayload } from '@payloadcms/next/withPayload'
import createNextIntlPlugin from 'next-intl/plugin'
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    staleTimes: {
      dynamic: 0,
    },
  },
  // Externalize dockerode and its native dependencies for server-side only
  serverExternalPackages: ['dockerode', 'ssh2', 'cpu-features'],
  // Proxy ddnet.org skin images to avoid CORS issues with TeeAssembler canvas
  async rewrites() {
    return [
      {
        source: '/ddnet-skins/:path*',
        destination: 'https://ddnet.org/skins/:path*',
      },
    ]
  },
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
      webpackConfig.externals.push('dockerode', 'ssh2', 'cpu-features')
    }

    return webpackConfig
  },
}
const withNextIntl = createNextIntlPlugin()
export default withPayload(withNextIntl(nextConfig), { devBundleServerPackages: false })
