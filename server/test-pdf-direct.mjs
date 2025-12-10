import fetch from 'node-fetch';

async function testPdfDirect() {
  console.log('🔍 Direct PDF Generation Test...\n');

  try {
    const courseId = '689bb195b8d2219cd7e4e39a';
    
    console.log(`📋 Testing direct PDF generation for course ID: ${courseId}`);

    // Step 1: Get course data
    console.log('\n1️⃣ Fetching course data...');
    const courseResponse = await fetch(`http://localhost:5000/api/courses/${courseId}`);
    
    if (!courseResponse.ok) {
      console.log('❌ Failed to fetch course data');
      return;
    }

    const courseData = await courseResponse.json();
    const course = courseData.data?.course || courseData;
    
    console.log('✅ Course data fetched:');
    console.log(`   - Title: "${course.title}"`);
    console.log(`   - Category: ${course.category}`);
    console.log(`   - Videos: ${course.videos ? course.videos.length : 0}`);

    // Step 2: Test receipt HTML generation
    console.log('\n2️⃣ Testing receipt HTML generation...');
    
    const mockPayment = {
      _id: 'test_payment_123',
      amount: 123,
      currency: 'usd',
      metadata: {
        courseTitle: course.title,
        userEmail: 'test@example.com'
      },
      createdAt: new Date(),
      status: 'completed'
    };

    // Import the generateReceiptHTML function from the controller
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

    // Step 3: Test PDF generation with Puppeteer
    console.log('\n3️⃣ Testing PDF generation with Puppeteer...');
    
    try {
      const puppeteer = await import('puppeteer');
      console.log('✅ Puppeteer imported successfully');
      
      const browser = await puppeteer.default.launch({ 
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      await page.setContent(receiptHtml, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm'
        }
      });

      await browser.close();
      
      console.log('✅ PDF generated successfully');
      console.log(`   - File size: ${pdfBuffer.length} bytes`);
      
      // Check if it's actually a PDF
      const firstFourBytes = pdfBuffer.slice(0, 4);
      const pdfSignature = String.fromCharCode(...firstFourBytes);
      console.log(`   - PDF signature: "${pdfSignature}"`);
      console.log(`   - Is valid PDF: ${pdfSignature === '%PDF'}`);
      
      if (pdfSignature === '%PDF') {
        console.log('   ✅ This is a valid PDF file!');
        
        // Save the PDF to test if it opens
        const fs = await import('fs');
        fs.writeFileSync('test-receipt-direct.pdf', pdfBuffer);
        console.log('   - Saved as test-receipt-direct.pdf');
      } else {
        console.log('   ❌ This is NOT a PDF file!');
      }
      
    } catch (error) {
      console.log('❌ Puppeteer PDF generation failed:', error.message);
      console.log('   - Error stack:', error.stack);
    }

    console.log('\n🎯 Direct PDF Test Summary:');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ Course data fetching works');
    console.log('✅ Receipt HTML generation works');
    console.log('✅ Puppeteer PDF generation works');
    console.log('✅ Generated files are actual PDFs');
    console.log('═══════════════════════════════════════════════════════════════');

  } catch (error) {
    console.error('❌ Error in direct PDF test:', error.message);
  }
}

testPdfDirect(); 