import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

export default withNextIntl({
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: []
  },
  poweredByHeader: false,
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        {key: 'X-Content-Type-Options', value: 'nosniff'},
        {key: 'X-Frame-Options', value: 'DENY'},
        {key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains'},
        {key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin'},
        {key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()'}
      ]
    }];
  }
});
