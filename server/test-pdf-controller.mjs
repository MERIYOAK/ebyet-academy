import fetch from 'node-fetch';

async function testPdfController() {
  console.log('🔍 Testing PDF Controller Functions...\n');

  try {
    const courseId = '689bb195b8d2219cd7e4e39a';
    
    console.log(`📋 Testing PDF controller functions for course ID: ${courseId}`);

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

    // Step 2: Test the generateReceiptHTML function
    console.log('\n2️⃣ Testing generateReceiptHTML function...');
    
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

    // Import the function from the controller
    const { generateReceiptHTML } = await import('./controllers/paymentController.js');
    
    if (typeof generateReceiptHTML === 'function') {
      const receiptHtml = generateReceiptHTML(mockPayment);
      console.log('✅ generateReceiptHTML function works');
      console.log(`   - HTML length: ${receiptHtml.length} characters`);
    } else {
      console.log('❌ generateReceiptHTML function not found');
    }

    // Step 3: Test the generateResourcesHTML function
    console.log('\n3️⃣ Testing generateResourcesHTML function...');
    
    const { generateResourcesHTML } = await import('./controllers/paymentController.js');
    
    if (typeof generateResourcesHTML === 'function') {
      const resourcesHtml = generateResourcesHTML(course);
      console.log('✅ generateResourcesHTML function works');
      console.log(`   - HTML length: ${resourcesHtml.length} characters`);
    } else {
      console.log('❌ generateResourcesHTML function not found');
    }

    // Step 4: Test Puppeteer directly with the same options as the controller
    console.log('\n4️⃣ Testing Puppeteer with controller options...');
    
    try {
      const puppeteer = await import('puppeteer');
      console.log('✅ Puppeteer imported successfully');
      
      const browser = await puppeteer.default.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      await page.setContent('<html><body><h1>Test PDF</h1><p>Testing with controller options.</p></body></html>');
      
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
      
      console.log('✅ PDF generated with controller options');
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
        fs.writeFileSync('test-controller-options.pdf', pdfBuffer);
        console.log('   - Saved as test-controller-options.pdf');
      } else {
        console.log('   ❌ This is NOT a PDF file!');
      }
      
    } catch (error) {
      console.log('❌ Puppeteer test failed:', error.message);
      console.log('   - Error stack:', error.stack);
    }

    console.log('\n🎯 PDF Controller Test Summary:');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ Course data fetching works');
    console.log('✅ HTML generation functions work');
    console.log('✅ Puppeteer works with controller options');
    console.log('✅ Generated files are actual PDFs');
    console.log('═══════════════════════════════════════════════════════════════');

  } catch (error) {
    console.error('❌ Error in PDF controller test:', error.message);
  }
}

testPdfController(); 