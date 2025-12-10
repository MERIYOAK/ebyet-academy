import fetch from 'node-fetch';
import fs from 'fs';

async function testActualDownload() {
  console.log('🔍 Testing Actual Download Content...\n');

  try {
    const courseId = '689bb195b8d2219cd7e4e39a';
    
    console.log(`📋 Testing actual download content for course ID: ${courseId}`);

    // Step 1: First, let's simulate a purchase by sending a webhook
    console.log('\n1️⃣ Simulating purchase via webhook...');
    
    const webhookBody = {
      id: 'evt_actual_test_123',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_actual_test_123',
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

    // Step 2: Test receipt download without authentication first
    console.log('\n2️⃣ Testing Receipt Download (no auth)...');
    
    const receiptResponse = await fetch(`http://localhost:5000/api/payment/download-receipt/${courseId}`);
    
    console.log(`📥 Receipt status: ${receiptResponse.status}`);
    console.log(`📥 Content-Type: ${receiptResponse.headers.get('content-type')}`);
    console.log(`📥 Content-Disposition: ${receiptResponse.headers.get('content-disposition')}`);
    
    if (receiptResponse.ok) {
      const receiptBuffer = await receiptResponse.buffer();
      console.log(`✅ Receipt content received`);
      console.log(`   - File size: ${receiptBuffer.length} bytes`);
      
      // Check if it's actually a PDF
      const firstFourBytes = receiptBuffer.slice(0, 4);
      const pdfSignature = String.fromCharCode(...firstFourBytes);
      console.log(`   - PDF signature: "${pdfSignature}"`);
      console.log(`   - Is valid PDF: ${pdfSignature === '%PDF'}`);
      
      // Save the file to see what it actually contains
      fs.writeFileSync('test-receipt-download.bin', receiptBuffer);
      console.log('   - Saved as test-receipt-download.bin');
      
      // Also try to save as text to see if it's HTML
      const contentAsText = receiptBuffer.toString();
      fs.writeFileSync('test-receipt-download.txt', contentAsText);
      console.log('   - Saved as test-receipt-download.txt');
      
      // Show first 200 characters
      console.log(`   - First 200 chars: ${contentAsText.substring(0, 200)}`);
      
    } else {
      const errorText = await receiptResponse.text();
      console.log(`❌ Receipt download failed: ${receiptResponse.statusText}`);
      console.log(`   - Error details: ${errorText}`);
    }

    // Step 3: Test resources download without authentication
    console.log('\n3️⃣ Testing Resources Download (no auth)...');
    
    const resourcesResponse = await fetch(`http://localhost:5000/api/payment/download-resources/${courseId}`);
    
    console.log(`📥 Resources status: ${resourcesResponse.status}`);
    console.log(`📥 Content-Type: ${resourcesResponse.headers.get('content-type')}`);
    console.log(`📥 Content-Disposition: ${resourcesResponse.headers.get('content-disposition')}`);
    
    if (resourcesResponse.ok) {
      const resourcesBuffer = await resourcesResponse.buffer();
      console.log(`✅ Resources content received`);
      console.log(`   - File size: ${resourcesBuffer.length} bytes`);
      
      // Check if it's actually a PDF
      const firstFourBytes = resourcesBuffer.slice(0, 4);
      const pdfSignature = String.fromCharCode(...firstFourBytes);
      console.log(`   - PDF signature: "${pdfSignature}"`);
      console.log(`   - Is valid PDF: ${pdfSignature === '%PDF'}`);
      
      // Save the file to see what it actually contains
      fs.writeFileSync('test-resources-download.bin', resourcesBuffer);
      console.log('   - Saved as test-resources-download.bin');
      
      // Also try to save as text to see if it's HTML
      const contentAsText = resourcesBuffer.toString();
      fs.writeFileSync('test-resources-download.txt', contentAsText);
      console.log('   - Saved as test-resources-download.txt');
      
      // Show first 200 characters
      console.log(`   - First 200 chars: ${contentAsText.substring(0, 200)}`);
      
    } else {
      const errorText = await resourcesResponse.text();
      console.log(`❌ Resources download failed: ${resourcesResponse.statusText}`);
      console.log(`   - Error details: ${errorText}`);
    }

    console.log('\n🎯 Actual Download Test Summary:');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ Webhook processing works');
    console.log('🔍 Check the saved files to see actual content');
    console.log('🔍 Files saved as .bin and .txt for analysis');
    console.log('═══════════════════════════════════════════════════════════════');

  } catch (error) {
    console.error('❌ Error in actual download test:', error.message);
  }
}

testActualDownload(); 