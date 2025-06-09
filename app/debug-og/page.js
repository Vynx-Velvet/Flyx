export default function DebugOG() {
  return (
    <div style={{
      padding: '40px',
      maxWidth: '800px',
      margin: '0 auto',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <h1>🔍 Open Graph Debug Page</h1>
      
      <div style={{
        background: '#f5f5f5',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h2>Current Metadata URLs:</h2>
        <ul>
          <li><strong>Open Graph Image:</strong> <a href="/opengraph-image" target="_blank">/opengraph-image</a></li>
          <li><strong>Twitter Image:</strong> <a href="/twitter-image" target="_blank">/twitter-image</a></li>
          <li><strong>Icon:</strong> <a href="/icon" target="_blank">/icon</a></li>
          <li><strong>Apple Icon:</strong> <a href="/apple-icon" target="_blank">/apple-icon</a></li>
        </ul>
      </div>

      <div style={{
        background: '#e3f2fd',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h2>🔧 Discord Troubleshooting Steps:</h2>
        <ol>
          <li><strong>Clear Discord Cache:</strong> Discord aggressively caches link previews. Try sharing your link in a private/incognito browser first.</li>
          <li><strong>Wait for Cache:</strong> Discord can take 5-10 minutes to update cached previews.</li>
          <li><strong>Test with Different URLs:</strong> Try adding a query parameter like <code>?v=1</code> to force Discord to refetch.</li>
          <li><strong>Use Discord's Debug Tool:</strong> Unfortunately, Discord doesn't have a public debug tool like Facebook does.</li>
          <li><strong>Check Network Tab:</strong> Use browser dev tools to see if the OG image is loading correctly.</li>
        </ol>
      </div>

      <div style={{
        background: '#f3e5f5',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h2>📱 Test Your Links:</h2>
        <ul>
          <li><strong>Facebook Debugger:</strong> <a href="https://developers.facebook.com/tools/debug/" target="_blank">Facebook Open Graph Debugger</a></li>
          <li><strong>Twitter Validator:</strong> <a href="https://cards-dev.twitter.com/validator" target="_blank">Twitter Card Validator</a></li>
          <li><strong>LinkedIn Inspector:</strong> <a href="https://www.linkedin.com/post-inspector/" target="_blank">LinkedIn Post Inspector</a></li>
        </ul>
      </div>

      <div style={{
        background: '#fff3cd',
        padding: '20px',
        borderRadius: '8px'
      }}>
        <h2>⚠️ Common Issues:</h2>
        <ul>
          <li><strong>HTTPS Required:</strong> Make sure your site is served over HTTPS</li>
          <li><strong>Image Size:</strong> Our images are 1200x630px (recommended)</li>
          <li><strong>File Size:</strong> Keep images under 8MB (ours are much smaller)</li>
          <li><strong>Absolute URLs:</strong> We're using absolute URLs for Discord compatibility</li>
        </ul>
      </div>
    </div>
  )
} 