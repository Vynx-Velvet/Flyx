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
        url: 'https://flyx.vercel.app/opengraph-image', // Absolute URL for Discord
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
    images: ['https://flyx.vercel.app/twitter-image'], // Absolute URL
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
  // Additional meta tags for better Discord support
  other: {
    'og:image:width': '1200',
    'og:image:height': '630',
    'og:image:type': 'image/png',
    'og:image:alt': 'Flyx 2.0 - Stream Beyond',
    // Discord-specific
    'theme-color': '#6366f1',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Essential meta tags for Discord */}
        <meta property="og:title" content="Flyx 2.0 - Stream Beyond" />
        <meta property="og:description" content="Discover and stream your favorite movies and TV shows with Flyx 2.0. Your ultimate entertainment destination." />
        <meta property="og:image" content="https://flyx.vercel.app/opengraph-image" />
        <meta property="og:url" content="https://flyx.vercel.app" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Flyx 2.0" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:type" content="image/png" />
        
        {/* Theme colors */}
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