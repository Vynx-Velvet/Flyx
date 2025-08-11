import { ImageResponse } from 'next/og'

// Remove edge runtime to avoid WASM module issues
// export const runtime = 'edge'

export const size = {
  width: 180,
  height: 180,
}

export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #06b6d4)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '32px',
          position: 'relative',
        }}
      >
        {/* Subtle background pattern */}
        <div
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            opacity: 0.1,
            background: `
              radial-gradient(circle at 30% 30%, white 0%, transparent 50%),
              radial-gradient(circle at 70% 70%, white 0%, transparent 50%)
            `,
            borderRadius: '32px',
          }}
        />
        
        <svg
          width="120"
          height="120"
          viewBox="0 0 32 32"
          fill="none"
          style={{ zIndex: 1 }}
        >
          <path
            d="M4 8L16 2L28 8V24L16 30L4 24V8Z"
            stroke="white"
            strokeWidth="1.5"
            fill="rgba(255, 255, 255, 0.15)"
          />
          <circle cx="16" cy="16" r="6" fill="white" />
          <path
            d="M12 16L15 19L20 13"
            stroke="#6366f1"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  )
} 