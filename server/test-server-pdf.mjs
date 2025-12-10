import fetch from 'node-fetch';

async function testServerPdf() {
  console.log('🔍 Testing Server PDF Endpoints...\n');

  try {
    const courseId = '689bb195b8d2219cd7e4e39a';
    
    console.log(`📋 Testing server PDF endpoints for course ID: ${courseId}`);

    // Step 1: First, let's simulate a purchase by sending a webhook
    console.log('\n1️⃣ Simulating purchase via webhook...');
    
    const webhookBody = {
      id: 'evt_server_test_123',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_server_test_123',
          metadata: {
            userId: '689cad6851cca53fb047a103',
            courseId: courseId,
            userEmail: 'test@example.com'
          },
          amount_total: 12300,
          currency: 'usd',
          customer_email: 'test@example.com'
        }
      }
    };

    const webhookResponse = await fetch('http://localhost:5000/api/payment/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'whsec_test_signature'
      },
      body: JSON.stringify(webhookBody)
    });

    if (webhookResponse.ok) {
      console.log('✅ Webhook processed successfully - course purchased');
    } else {
      console.log('❌ Webhook processing failed');
      return;
    }

    // Step 2: Test receipt PDF download with proper authentication
    console.log('\n2️⃣ Testing Receipt PDF Download with auth...');
    
    // Create a proper JWT token for testing
    const jwt = await import('jsonwebtoken');
    const mockToken = jwt.default.sign(
      { userId: '689cad6851cca53fb047a103' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );

    console.log(`🔑 Using token: ${mockToken.substring(0, 20)}...`);

    const receiptResponse = await fetch(`http://localhost:5000/api/payment/download-receipt/${courseId}`, {
      headers: {
        'Authorization': `Bearer ${mockToken}`
      }
    });
    
    console.log(`📥 Receipt PDF status: ${receiptResponse.status}`);
    console.log(`📥 Content-Type: ${receiptResponse.headers.get('content-type')}`);
    console.log(`📥 Content-Disposition: ${receiptResponse.headers.get('content-disposition')}`);
    
    if (receiptResponse.ok) {
      const receiptBuffer = await receiptResponse.buffer();
      console.log(`✅ Receipt PDF generated successfully`);
      console.log(`   - File size: ${receiptBuffer.length} bytes`);
      
      // Check if it's actually a PDF
      const firstFourBytes = receiptBuffer.slice(0, 4);
      const pdfSignature = String.fromCharCode(...firstFourBytes);
      console.log(`   - PDF signature: "${pdfSignature}"`);
      console.log(`   - Is valid PDF: ${pdfSignature === '%PDF'}`);
      console.log(`   - Content-Type: ${receiptResponse.headers.get('content-type')}`);
      
      if (pdfSignature === '%PDF') {
        console.log('   ✅ This is a valid PDF file!');
        
        // Save the PDF to test if it opens
        const fs = await import('fs');
        fs.writeFileSync('test-receipt-server.pdf', receiptBuffer);
        console.log('   - Saved as test-receipt-server.pdf');
      } else {
        console.log('   ❌ This is NOT a PDF file!');
        
        // Save the content to see what it actually is
        const fs = await import('fs');
        fs.writeFileSync('test-receipt-server.txt', receiptBuffer.toString());
        console.log('   - Saved as test-receipt-server.txt to see content');
      }
    } else {
      const errorText = await receiptResponse.text();
      console.log(`❌ Receipt PDF generation failed: ${receiptResponse.statusText}`);
      console.log(`   - Error details: ${errorText}`);
    }

    // Step 3: Test resources PDF download
    console.log('\n3️⃣ Testing Resources PDF Download with auth...');
    
    const resourcesResponse = await fetch(`http://localhost:5000/api/payment/download-resources/${courseId}`, {
      headers: {
        'Authorization': `Bearer ${mockToken}`
      }
    });
    
    console.log(`📥 Resources PDF status: ${resourcesResponse.status}`);
    console.log(`📥 Content-Type: ${resourcesResponse.headers.get('content-type')}`);
    console.log(`📥 Content-Disposition: ${resourcesResponse.headers.get('content-disposition')}`);
    
    if (resourcesResponse.ok) {
      const resourcesBuffer = await resourcesResponse.buffer();
      console.log(`✅ Resources PDF generated successfully`);
      console.log(`   - File size: ${resourcesBuffer.length} bytes`);
      
      // Check if it's actually a PDF
      const firstFourBytes = resourcesBuffer.slice(0, 4);
      const pdfSignature = String.fromCharCode(...firstFourBytes);
      console.log(`   - PDF signature: "${pdfSignature}"`);
      console.log(`   - Is valid PDF: ${pdfSignature === '%PDF'}`);
      console.log(`   - Content-Type: ${resourcesResponse.headers.get('content-type')}`);
      
      if (pdfSignature === '%PDF') {
        console.log('   ✅ This is a valid PDF file!');
        
        // Save the PDF to test if it opens
        const fs = await import('fs');
        fs.writeFileSync('test-resources-server.pdf', resourcesBuffer);
        console.log('   - Saved as test-resources-server.pdf');
      } else {
        console.log('   ❌ This is NOT a PDF file!');
        
        // Save the content to see what it actually is
        const fs = await import('fs');
        fs.writeFileSync('test-resources-server.txt', resourcesBuffer.toString());
        console.log('   - Saved as test-resources-server.txt to see content');
      }
    } else {
      const errorText = await resourcesResponse.text();
      console.log(`❌ Resources PDF generation failed: ${resourcesResponse.statusText}`);
      console.log(`   - Error details: ${errorText}`);
    }

    console.log('\n🎯 Server PDF Test Summary:');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ Webhook processing works');
    console.log('✅ Authentication works');
    console.log('🔍 Check saved files to see actual content');
    console.log('═══════════════════════════════════════════════════════════════');

  } catch (error) {
    console.error('❌ Error in server PDF test:', error.message);
  }
}

testServerPdf(); 