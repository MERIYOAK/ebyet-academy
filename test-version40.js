const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/drm/courses/69790910eedf55c69b320094/videos?version=40',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'Test-Client'
  }
};

console.log('🚀 Making request to:', options.hostname + ':' + options.port + options.path);

const req = http.request(options, (res) => {
  console.log('📡 Response status:', res.statusCode);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('📦 Response received, length:', data.length);
    try {
      const jsonData = JSON.parse(data);
      console.log('✅ Parsed JSON response');
      console.log('📊 Videos count:', jsonData.data?.course?.videos?.length || 0);
      if (jsonData.data?.course?.videos?.length > 0) {
        console.log('🎥 First video:', jsonData.data.course.videos[0].title);
        console.log('🎥 Total videos:', jsonData.data.course.videos.length);
      }
    } catch (e) {
      console.log('❌ Failed to parse JSON:', e.message);
      console.log('Raw response (first 200 chars):', data.substring(0, 200));
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request error:', e.message);
});

req.setTimeout(10000, () => {
  console.log('⏰ Request timeout');
  req.destroy();
});

req.end();
