import fetch from 'node-fetch';

async function testPdfDebug() {
  console.log('🔍 Debugging PDF Generation...\n');

  try {
    // Test 1: Check what Puppeteer is actually generating
    console.log('1️⃣ Testing Puppeteer PDF generation...');
    
    const puppeteer = await import('puppeteer');
    console.log('✅ Puppeteer imported successfully');
    
    const browser = await puppeteer.default.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setContent('<html><body><h1>Test PDF</h1><p>This is a test PDF generation.</p></body></html>');
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true
    });
    
    await browser.close();
    
    console.log('📊 PDF Buffer Analysis:');
    console.log(`   - Buffer length: ${pdfBuffer.length} bytes`);
    console.log(`   - First 10 bytes: ${pdfBuffer.slice(0, 10).toString('hex')}`);
    console.log(`   - First 20 chars: ${pdfBuffer.slice(0, 20).toString()}`);
    
    // Check if it's actually a PDF by looking for PDF signature
    const firstFourBytes = pdfBuffer.slice(0, 4);
    const pdfSignature = String.fromCharCode(...firstFourBytes);
    const isPdf = pdfSignature === '%PDF';
    console.log(`   - First 4 bytes: [${Array.from(firstFourBytes).join(', ')}]`);
    console.log(`   - PDF signature: "${pdfSignature}"`);
    console.log(`   - Is valid PDF: ${isPdf}`);
    
    if (!isPdf) {
      console.log('❌ Generated content is not a PDF!');
      console.log('   - This might be HTML content instead');
      console.log('   - Let\'s check the actual content:');
      console.log(`   - Content preview: ${pdfBuffer.slice(0, 200).toString()}`);
    } else {
      console.log('✅ Generated content is a valid PDF!');
    }

    // Test 2: Try different Puppeteer options
    console.log('\n2️⃣ Testing with different Puppeteer options...');
    
    const browser2 = await puppeteer.default.launch({ 
      headless: 'new', // Use new headless mode
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page2 = await browser2.newPage();
    await page2.setContent('<html><body><h1>Test PDF v2</h1><p>Testing with new headless mode.</p></body></html>');
    
    const pdfBuffer2 = await page2.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      }
    });
    
    await browser2.close();
    
    console.log('📊 PDF Buffer 2 Analysis:');
    console.log(`   - Buffer length: ${pdfBuffer2.length} bytes`);
    console.log(`   - First 10 bytes: ${pdfBuffer2.slice(0, 10).toString('hex')}`);
    console.log(`   - First 20 chars: ${pdfBuffer2.slice(0, 20).toString()}`);
    const firstFourBytes2 = pdfBuffer2.slice(0, 4);
    const pdfSignature2 = String.fromCharCode(...firstFourBytes2);
    console.log(`   - First 4 bytes: [${Array.from(firstFourBytes2).join(', ')}]`);
    console.log(`   - PDF signature: "${pdfSignature2}"`);
    console.log(`   - Is valid PDF: ${pdfSignature2 === '%PDF'}`);

    // Test 3: Check if there's an issue with the PDF generation function
    console.log('\n3️⃣ Testing the actual receipt HTML generation...');
    
    const mockPayment = {
      _id: 'test_payment_123',
      amount: 123,
      currency: 'usd',
      metadata: {
        courseTitle: 'test eight',
        userEmail: 'test@example.com'
      },
      createdAt: new Date(),
      status: 'completed'
    };

    // Generate receipt HTML
    const generateReceiptHTML = (payment) => {
      const orderId = payment._id.toString().slice(-8).toUpperCase();
      const paymentDate = payment.createdAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Receipt - ${orderId}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .receipt {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #e5e5e5;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
        }
        .receipt-title {
            font-size: 18px;
            color: #374151;
            margin-bottom: 5px;
        }
        .order-id {
            font-size: 14px;
            color: #6b7280;
        }
        .details {
            margin-bottom: 30px;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding: 8px 0;
            border-bottom: 1px solid #f3f4f6;
        }
        .detail-label {
            font-weight: 500;
            color: #374151;
        }
        .detail-value {
            color: #1f2937;
        }
        .total {
            border-top: 2px solid #e5e5e5;
            padding-top: 20px;
            margin-top: 20px;
        }
        .total-row {
            display: flex;
            justify-content: space-between;
            font-size: 18px;
            font-weight: bold;
            color: #059669;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e5e5;
            color: #6b7280;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="receipt">
        <div class="header">
            <div class="logo">Persi Academy</div>
            <div class="receipt-title">Payment Receipt</div>
            <div class="order-id">Order #${orderId}</div>
        </div>
        
        <div class="details">
            <div class="detail-row">
                <span class="detail-label">Course:</span>
                <span class="detail-value">${payment.metadata.courseTitle}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Customer:</span>
                <span class="detail-value">${payment.metadata.userEmail}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Payment Date:</span>
                <span class="detail-value">${paymentDate}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Payment Method:</span>
                <span class="detail-value">Credit Card</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="detail-value">Completed</span>
            </div>
        </div>
        
        <div class="total">
            <div class="total-row">
                <span>Total Amount:</span>
                <span>$${payment.amount.toFixed(2)} ${payment.currency.toUpperCase()}</span>
            </div>
        </div>
        
        <div class="footer">
            <p>Thank you for your purchase!</p>
            <p>This receipt serves as proof of payment for your course purchase.</p>
            <p>For support, contact us at support@persiacademy.com</p>
        </div>
    </div>
</body>
</html>
      `;
    };

    const receiptHtml = generateReceiptHTML(mockPayment);
    console.log('✅ Receipt HTML generated successfully');
    console.log(`   - HTML length: ${receiptHtml.length} characters`);

    // Test PDF generation with the receipt HTML
    const browser3 = await puppeteer.default.launch({ 
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page3 = await browser3.newPage();
    await page3.setContent(receiptHtml, { waitUntil: 'networkidle0' });
    
    const receiptPdfBuffer = await page3.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      }
    });

    await browser3.close();
    
    console.log('📊 Receipt PDF Analysis:');
    console.log(`   - Buffer length: ${receiptPdfBuffer.length} bytes`);
    console.log(`   - First 10 bytes: ${receiptPdfBuffer.slice(0, 10).toString('hex')}`);
    console.log(`   - First 20 chars: ${receiptPdfBuffer.slice(0, 20).toString()}`);
    const firstFourBytes3 = receiptPdfBuffer.slice(0, 4);
    const pdfSignature3 = String.fromCharCode(...firstFourBytes3);
    console.log(`   - First 4 bytes: [${Array.from(firstFourBytes3).join(', ')}]`);
    console.log(`   - PDF signature: "${pdfSignature3}"`);
    console.log(`   - Is valid PDF: ${pdfSignature3 === '%PDF'}`);

    console.log('\n🎯 PDF Debug Summary:');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ Puppeteer is working');
    console.log('✅ HTML generation works');
    console.log('✅ PDF generation produces files');
    console.log('🔍 Need to verify PDF format');
    console.log('═══════════════════════════════════════════════════════════════');

  } catch (error) {
    console.error('❌ Error in PDF debug test:', error.message);
  }
}

testPdfDebug(); 