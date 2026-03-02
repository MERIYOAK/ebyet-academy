/**
 * Verify Course Status and Access
 * Checks if course is properly accessible
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const COURSE_ID = '69790910eedf55c69b320094';

async function verifyCourseStatus() {
  let client;
  
  try {
    console.log('🔍 Verifying course status and access...');
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
      console.log('❌ Course not found in database');
      process.exit(1);
    }
    
    console.log('✅ Course found');
    console.log('\n📋 Course Status:');
    console.log(`   - Title: ${course.title?.en || course.title}`);
    console.log(`   - Status: ${course.status}`);
    console.log(`   - Is Public: ${course.isPublic}`);
    console.log(`   - Featured: ${course.featured}`);
    console.log(`   - Requires Approval: ${course.requiresApproval}`);
    console.log(`   - Total Enrollments: ${course.totalEnrollments}`);
    console.log(`   - Videos: ${course.videos?.length || 0}`);
    console.log(`   - Last Modified: ${course.updatedAt}`);
    
    // Check if course should be accessible
    const shouldBeAccessible = course.status === 'active' && course.isPublic === true;
    
    console.log('\n🔍 Access Check:');
    console.log(`   - Should be accessible: ${shouldBeAccessible ? '✅ YES' : '❌ NO'}`);
    
    if (shouldBeAccessible) {
      console.log('   ✅ Course permissions look correct');
      console.log('   🔧 Issue might be:');
      console.log('      1. Backend server needs restart');
      console.log('      2. Authentication middleware issue');
      console.log('      3. Frontend caching issue');
    } else {
      console.log('   ❌ Course has access restrictions');
      console.log('   🔧 Fixing permissions...');
      
      // Fix permissions
      await db.collection('courses').updateOne(
        { _id: new ObjectId(COURSE_ID) },
        { 
          $set: { 
            status: 'active',
            isPublic: true,
            requiresApproval: false,
            updatedAt: new Date()
          }
        }
      );
      
      console.log('   ✅ Permissions fixed');
    }
    
    // Check version update notification issue
    console.log('\n🔍 Version Update Notification:');
    console.log('   - This appears when frontend detects version changes');
    console.log('   - Should not affect course access');
    console.log('   - May cause temporary UI refresh');
    
    console.log('\n🚀 Recommended Actions:');
    console.log('   1. RESTART BACKEND SERVER: npm start or node server.js');
    console.log('   2. Clear browser cache and refresh');
    console.log('   3. Try accessing course again');
    console.log('   4. Check backend logs for access check messages');
    
    if (shouldBeAccessible) {
      console.log('\n✅ Course is properly configured');
      console.log('🔄 The 403 error should be resolved after backend restart');
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    console.error(error.stack);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 Database connection closed');
    }
  }
}

if (require.main === module) {
  console.log('🔍 Course Status Verification Tool');
  console.log('===================================');
  verifyCourseStatus();
}

module.exports = { verifyCourseStatus };
