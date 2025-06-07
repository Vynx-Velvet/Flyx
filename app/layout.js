import './globals.css'

export const metadata = {
  title: 'Flyx 2.0',
  description: 'Movie and TV show discovery app',
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