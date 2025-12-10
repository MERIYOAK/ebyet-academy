import fetch from 'node-fetch';

async function testReceipt() {
  console.log('🧪 Testing Receipt Generation...\n');

  try {
    const courseId = '689bb195b8d2219cd7e4e39a';
    const userId = '689cad6851cca53fb047a103';
    
    console.log(`📋 Testing receipt for course ID: ${courseId}`);
    console.log(`📋 Using user ID: ${userId}`);

    // First, let's check if there's a payment record
    console.log('\n1️⃣ Checking payment records...');
    
    // Simulate a webhook to ensure there's a payment record
    const webhookBody = {
      id: 'evt_receipt_test_123',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_receipt_test_123',
          metadata: {
            userId: userId,
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
      console.log('✅ Webhook processed successfully');
    } else {
      console.log('❌ Webhook processing failed');
    }

    // Now test the receipt endpoint
    console.log('\n2️⃣ Testing receipt endpoint...');
    
    // This will fail without proper authentication, but we can see the response
    const receiptResponse = await fetch(`http://localhost:5000/api/payment/receipt/${courseId}`, {
      headers: {
        'Authorization': 'Bearer test_token' // This will fail but we can see the endpoint works
      }
    });

    console.log(`📥 Receipt response status: ${receiptResponse.status}`);
    
    if (receiptResponse.ok) {
      const receiptData = await receiptResponse.json();
      console.log('✅ Receipt data:', JSON.stringify(receiptData, null, 2));
    } else {
      const errorText = await receiptResponse.text();
      console.log('❌ Receipt error:', errorText);
    }

    // Test the course endpoint to see what course data is available
    console.log('\n3️⃣ Testing course endpoint...');
    const courseResponse = await fetch(`http://localhost:5000/api/courses/${courseId}`);
    
    if (courseResponse.ok) {
      const courseData = await courseResponse.json();
      console.log('✅ Course data:', JSON.stringify(courseData, null, 2));
    } else {
      console.log('❌ Course not found');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testReceipt(); 