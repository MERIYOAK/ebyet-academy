const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/courses/69790910eedf55c69b320094',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const jsonData = JSON.parse(data);
      console.log('Course currentVersion:', jsonData.data?.course?.currentVersion);
      console.log('Course title:', jsonData.data?.course?.title?.en);
    } catch (e) {
      console.log('Error parsing course data:', e.message);
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
});

req.end();
