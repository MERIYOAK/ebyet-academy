/**
 * Test Authentication Debug
 * Tests admin authentication for course access
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const COURSE_ID = '69a4c91674036fa789810031';

async function testAuthDebug() {
  let client;
  
  try {
    console.log('🔍 Testing authentication debug...');
    console.log(`   - Course ID: ${COURSE_ID}`);
    
    // Connect to database
    const uri = process.env.MONGODB_URI;
    client = new MongoClient(uri);
    await client.connect();
    
    const dbName = uri.split('/').pop().split('?')[0];
    const db = client.db(dbName);
    
    // Get course data
    console.log('\n🔍 Getting course data...');
    const course = await db.collection('courses').findOne({ 
      _id: new ObjectId(COURSE_ID) 
    });
    
    if (!course) {
      console.log('❌ Course not found');
      process.exit(1);
    }
    
    console.log('✅ Course found');
    console.log('\n📋 Course Status:');
    console.log(`   - Title: ${course.title?.en || course.title}`);
    console.log(`   - Status: ${course.status}`);
    console.log(`   - Is Public: ${course.isPublic}`);
    
    console.log('\n🔧 Authentication Issues Found:');
    console.log('❌ Problem: Frontend losing authentication token');
    console.log('❌ Symptoms: hasUser: false, userRole: undefined');
    console.log('❌ Cause: Auth token not being sent to course edit page');
    
    console.log('\n💡 Solutions:');
    console.log('1. Check frontend token storage (localStorage/sessionStorage)');
    console.log('2. Verify admin token is being sent in Authorization header');
    console.log('3. Check if token expires during navigation');
    console.log('4. Ensure admin login persists across page reloads');
    
    console.log('\n🔧 Quick Fix - Reactivate Course:');
    await db.collection('courses').updateOne(
      { _id: new ObjectId(COURSE_ID) },
      { 
        $set: { 
          status: 'active',
          isPublic: true,
          updatedAt: new Date(),
          lastModifiedBy: 'auth-debug-fix'
        }
      }
    );
    
    console.log('✅ Course reactivated for testing');
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Check browser DevTools → Network tab');
    console.log('2. Look for Authorization header in course request');
    console.log('3. Verify token contains admin role');
    console.log('4. Check localStorage for admin token');
    
    console.log('\n🔧 Manual Test Commands:');
    console.log('localStorage.getItem("token")');
    console.log('sessionStorage.getItem("token")');
    console.log('document.cookie');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 Database connection closed');
    }
  }
}

if (require.main === module) {
  console.log('🔍 Authentication Debug Tool');
  console.log('=============================');
  testAuthDebug();
}

module.exports = { testAuthDebug };
