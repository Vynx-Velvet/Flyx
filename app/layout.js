import './globals.css'

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#6366f1',
  colorScheme: 'dark light',
}

export const metadata = {
  title: 'Flyx 2.0 - Stream Beyond',
  description: 'Discover and stream your favorite movies and TV shows with Flyx 2.0. Your ultimate entertainment destination.',
  metadataBase: new URL('https://tv.vynx.cc'),
  keywords: ['movies', 'tv shows', 'streaming', 'entertainment', 'flyx'],
  authors: [{ name: 'Flyx Team' }],
  creator: 'Flyx Team',
  publisher: 'Flyx',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  // Open Graph tags
  openGraph: {
    title: 'Flyx 2.0 - Stream Beyond',
    description: 'Discover and stream your favorite movies and TV shows with Flyx 2.0. Your ultimate entertainment destination.',
    url: 'https://tv.vynx.cc',
    siteName: 'Flyx 2.0',
    images: [
      {
        url: 'https://tv.vynx.cc/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Flyx 2.0 - Stream Beyond',
        type: 'image/png',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  // Twitter Card tags
  twitter: {
    card: 'summary_large_image',
    title: 'Flyx 2.0 - Stream Beyond',
    description: 'Discover and stream your favorite movies and TV shows with Flyx 2.0. Your ultimate entertainment destination.',
    images: ['https://tv.vynx.cc/twitter-image'],
    creator: '@flyx', // Update with your actual Twitter handle if you have one
  },
  // Apple Touch Icon
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  // Manifest
  manifest: '/manifest.json',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
} 