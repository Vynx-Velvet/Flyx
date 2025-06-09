import './globals.css'

export const metadata = {
  title: 'Flyx 2.0 - Stream Beyond',
  description: 'Discover and stream your favorite movies and TV shows with Flyx 2.0. Your ultimate entertainment destination.',
  metadataBase: new URL('https://flyx.vercel.app'), // Update this with your actual domain
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
    url: 'https://flyx.vercel.app', // Update this with your actual domain
    siteName: 'Flyx 2.0',
    images: [
      {
        url: '/og-image.png', // We'll create this image
        width: 1200,
        height: 630,
        alt: 'Flyx 2.0 - Stream Beyond',
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
    images: ['/og-image.png'], // We'll create this image
    creator: '@flyx', // Update with your actual Twitter handle if you have one
  },
  // Apple Touch Icon
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png', // We'll create this
  },
  // Manifest
  manifest: '/manifest.json',
  // Theme color for mobile browsers
  themeColor: '#6366f1',
  // Color scheme
  colorScheme: 'dark light',
  // Viewport
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#6366f1" />
        <meta name="msapplication-TileColor" content="#6366f1" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
} 