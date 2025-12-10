import fetch from 'node-fetch';

async function testPdfSimpleEndpoint() {
  console.log('🔍 Testing Simple PDF Endpoint...\n');

  try {
    // Test a simple endpoint that should return binary data
    console.log('1️⃣ Testing simple binary endpoint...');
    
    const response = await fetch('http://localhost:5000/api/payment/download-receipt/689bb195b8d2219cd7e4e39a', {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    
    console.log(`📥 Status: ${response.status}`);
    console.log(`📥 Content-Type: ${response.headers.get('content-type')}`);
    console.log(`📥 Content-Length: ${response.headers.get('content-length')}`);
    
    if (response.ok) {
      const buffer = await response.buffer();
      console.log(`📥 Buffer length: ${buffer.length} bytes`);
      
      // Check if it's JSON or binary
      const firstChar = buffer.toString('utf8', 0, 1);
      console.log(`📥 First character: "${firstChar}"`);
      
      if (firstChar === '{') {
        console.log('❌ Response is JSON, not binary!');
        console.log('   - This means the server is converting the PDF buffer to JSON');
        console.log('   - The issue is likely middleware or server configuration');
      } else if (firstChar === '%') {
        console.log('✅ Response is binary PDF!');
        console.log('   - The server is correctly sending binary data');
      } else {
        console.log('❓ Response format unclear');
        console.log(`   - First 10 bytes: ${buffer.slice(0, 10).toString('hex')}`);
      }
    } else {
      const errorText = await response.text();
      console.log(`❌ Error: ${errorText}`);
    }

  } catch (error) {
    console.error('❌ Error in test:', error.message);
  }
}

testPdfSimpleEndpoint(); 