import fetch from 'node-fetch';

// Test the extraction script with a sample movie
async function testExtraction() {
  try {
    console.log('Testing VidSrc.cc M3U8 extraction...');
    
    // Test with a known movie (TMDB ID for "The Shawshank Redemption")
    const movieId = '278'; // TMDB ID for The Shawshank Redemption
    const mediaType = 'movie';
    
    // Make request to the extraction service
    const response = await fetch(`http://localhost:3002/extract-m3u8?mediaId=${movieId}&mediaType=${mediaType}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Extraction successful!');
      console.log('M3U8 URL:', result.m3u8Url);
    } else {
      console.log('❌ Extraction failed:', result.error);
    }
  } catch (error) {
    console.error('Error during test:', error.message);
  }
}

// Run the test
testExtraction();