import { extractProRcpUrl } from './vm-extractor-enhanced.js';

// Test HTML content from the task
const testHtml = `<!DOCTYPE html>
<html>
<head>
<title>Fight Club (1999)</title>
<!-- ... other content ... -->
</head>
<body data-i="0137523">
<!-- ... other content ... -->
<script>
var player = new Playerjs({id:"player_parent", file: 'https://tmstr2.shadowlandschronicles.com/pl/H4sIAAAAAAAAAwXBzZaCIBgA0FcCtE7O0kYtp3RE.PjZIdCxIBdNnYynn3vNLjeXrdtsLt64nffWEkIs3ho_7awv3Bdk.n5usJnCs2eSliOHkR3qPfCVaJg3AtrrhDDmsnp74ZQIemF8LZl0e4U1NaxUjBSfXh5T14ScfZ4NjXoAsp5cgpe6RQQJqq4psOP2wbM2ijvKAbXIZF3vQ5Usjo9OuLcS80ETikG4PYVyna5FNZG6F4EySzZKRPq2sTacddsf0tYTLnP2HZAW7e8pGx5C6uO4dHLgbeKIDja601itfz7UJYMyWR4TS1qdm_ncV_NNNx12kmqQcByTS.IAgS_twMn6UuS5uISKf1L1SBNBAQAA/master.m3u8' , cuid:"50627283dc40ce660f24a5e1454d9327",poster:"//image.tmdb.org/t/p/w780/hZkgoQYus5vegHoetLkCJzb17zJ.jpg" , ready:"PlayerReady" , autoplay:1 , subtitle: default_subtitles});
</script>
</body>
</html>`;

// Create a simple logger
const logger = {
  info: (msg, data) => console.log(`INFO: ${msg}`, data || ''),
  warn: (msg, data) => console.warn(`WARN: ${msg}`, data || ''),
  error: (msg, data) => console.error(`ERROR: ${msg}`, data || ''),
  debug: (msg, data) => console.debug(`DEBUG: ${msg}`, data || '')
};

// Import the extraction function
import { extractStreamUrl } from './vm-extractor-enhanced.js';

console.log('Testing CloudNestra ProRCP extraction...\n');

// Test the extraction
const streamUrl = extractStreamUrl(testHtml, logger);

if (streamUrl) {
  console.log('\n✅ SUCCESS! Extracted stream URL:');
  console.log(streamUrl);
  
  // Verify it's the expected URL
  const expectedUrl = 'https://tmstr2.shadowlandschronicles.com/pl/H4sIAAAAAAAAAwXBzZaCIBgA0FcCtE7O0kYtp3RE.PjZIdCxIBdNnYynn3vNLjeXrdtsLt64nffWEkIs3ho_7awv3Bdk.n5usJnCs2eSliOHkR3qPfCVaJg3AtrrhDDmsnp74ZQIemF8LZl0e4U1NaxUjBSfXh5T14ScfZ4NjXoAsp5cgpe6RQQJqq4psOP2wbM2ijvKAbXIZF3vQ5Usjo9OuLcS80ETikG4PYVyna5FNZG6F4EySzZKRPq2sTacddsf0tYTLnP2HZAW7e8pGx5C6uO4dHLgbeKIDja601itfz7UJYMyWR4TS1qdm_ncV_NNNx12kmqQcByTS.IAgS_twMn6UuS5uISKf1L1SBNBAQAA/master.m3u8';
  
  if (streamUrl === expectedUrl) {
    console.log('\n✅ URL matches expected value!');
  } else {
    console.log('\n❌ WARNING: URL does not match expected value');
    console.log('Expected:', expectedUrl);
    console.log('Got:', streamUrl);
  }
} else {
  console.log('\n❌ FAILED to extract stream URL');
}

// Also test with a simpler pattern
console.log('\n\nTesting with simpler pattern...');
const simpleHtml = `
<script>
var player = new Playerjs({
  id: "player_parent",
  file: "https://tmstr2.shadowlandschronicles.com/pl/test.m3u8",
  poster: "//image.tmdb.org/t/p/w780/test.jpg"
});
</script>
`;

const simpleUrl = extractStreamUrl(simpleHtml, logger);
console.log('Simple extraction result:', simpleUrl);

// Test edge cases
console.log('\n\nTesting edge cases...');

// Test with file parameter in different formats
const edgeCases = [
  `file: 'https://tmstr2.shadowlandschronicles.com/pl/test1.m3u8'`,
  `file:"https://tmstr2.shadowlandschronicles.com/pl/test2.m3u8"`,
  `file : "https://tmstr2.shadowlandschronicles.com/pl/test3.m3u8"`,
  `{file:'https://tmstr2.shadowlandschronicles.com/pl/test4.m3u8',`,
  `new Playerjs({file:"https://tmstr2.shadowlandschronicles.com/pl/test5.m3u8"`,
];

edgeCases.forEach((testCase, index) => {
  const result = extractStreamUrl(testCase, logger);
  console.log(`Edge case ${index + 1}: ${result ? '✅ Found' : '❌ Not found'} - ${result || 'N/A'}`);
});