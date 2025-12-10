import fetch from 'node-fetch';

async function simpleWebhookTest() {
  console.log('🧪 Simple Webhook Test...\n');

  try {
    // Simple webhook test
    const webhookBody = {
      id: 'evt_test_webhook_123',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_session_123',
          metadata: {
            userId: '689cad6851cca53fb047a103',
            courseId: '689bb195b8d2219cd7e4e39a',
            userEmail: 'test@example.com'
          },
          amount_total: 12300, // $123.00 in cents
          currency: 'usd',
          customer_email: 'test@example.com'
        }
      }
    };

    console.log('📤 Sending webhook...');
    console.log(`   - Event type: ${webhookBody.type}`);
    console.log(`   - User ID: ${webhookBody.data.object.metadata.userId}`);
    console.log(`   - Course ID: ${webhookBody.data.object.metadata.courseId}`);

    const response = await fetch('http://localhost:5000/api/payment/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'whsec_test_signature'
      },
      body: JSON.stringify(webhookBody)
    });

    console.log(`📥 Response status: ${response.status}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Webhook processed successfully!');
      console.log(`   - Response:`, result);
    } else {
      const errorText = await response.text();
      console.log('❌ Webhook processing failed');
      console.log(`   - Error: ${errorText}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

simpleWebhookTest(); 