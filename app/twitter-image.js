import { ImageResponse } from 'next/og'

// Remove edge runtime to avoid WASM module issues
// export const runtime = 'edge'

export const alt = 'Flyx 2.0 - Stream Beyond'
export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background pattern */}
        <div
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            opacity: 0.1,
            background: `
              radial-gradient(circle at 20% 20%, #6366f1 0%, transparent 50%),
              radial-gradient(circle at 80% 80%, #8b5cf6 0%, transparent 50%),
              radial-gradient(circle at 40% 90%, #06b6d4 0%, transparent 50%)
            `,
          }}
        />
        
        {/* Main content container */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            zIndex: 1,
          }}
        >
          {/* Logo */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '40px',
            }}
          >
            {/* Hexagon with gradient */}
            <svg
              width="120"
              height="120"
              viewBox="0 0 32 32"
              style={{ filter: 'drop-shadow(0 0 20px rgba(99, 102, 241, 0.5))' }}
            >
              <defs>
                <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="50%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
              <path
                d="M4 8L16 2L28 8V24L16 30L4 24V8Z"
                stroke="url(#logoGradient)"
                strokeWidth="2"
                fill="rgba(99, 102, 241, 0.2)"
              />
              <circle cx="16" cy="16" r="6" fill="url(#logoGradient)" />
              <path
                d="M12 16L15 19L20 13"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: '72px',
              fontWeight: 'bold',
              color: 'white',
              margin: '0',
              textAlign: 'center',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #06b6d4)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
            }}
          >
            FLYX 2.0
          </h1>

          {/* Tagline */}
          <p
            style={{
              fontSize: '32px',
              color: '#a1a1aa',
              margin: '16px 0 0 0',
              textAlign: 'center',
              fontWeight: '300',
            }}
          >
            Stream Beyond
          </p>

          {/* Description */}
          <p
            style={{
              fontSize: '24px',
              color: '#71717a',
              margin: '24px 0 0 0',
              textAlign: 'center',
              maxWidth: '800px',
              lineHeight: 1.4,
            }}
          >
            Your ultimate entertainment destination
          </p>
        </div>

        {/* Decorative elements */}
        <div
          style={{
            position: 'absolute',
            top: '50px',
            right: '50px',
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, transparent 70%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '50px',
            left: '50px',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)',
          }}
        />
        
        {/* Twitter branding indicator */}
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            fontSize: '16px',
            color: '#71717a',
            opacity: 0.5,
          }}
        >
          tv.vynx.cc
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
} 