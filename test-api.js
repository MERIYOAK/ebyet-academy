const fetch = require('node-fetch');

fetch('http://localhost:5000/api/drm/courses/69790910eedf55c69b320094/videos')
  .then(response => response.json())
  .then(data => {
    console.log('API Response:');
    console.log(JSON.stringify(data, null, 2));
  })
  .catch(error => {
    console.error('Error:', error);
  });
