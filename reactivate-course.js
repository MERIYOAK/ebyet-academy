/**
 * Reactivate Course
 * Fixes course that was accidentally deactivated
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const COURSE_ID = '69a4c91674036fa789810031';

async function reactivateCourse() {
  let client;
  
  try {
    console.log('🔧 Reactivating course...');
    console.log(`   - Course ID: ${COURSE_ID}`);
    
    // Connect to database
    const uri = process.env.MONGODB_URI;
    client = new MongoClient(uri);
    await client.connect();
    
    const dbName = uri.split('/').pop().split('?')[0];
    const db = client.db(dbName);
    
    // Get current course data
    console.log('\n🔍 Getting current course data...');
    const course = await db.collection('courses').findOne({ 
      _id: new ObjectId(COURSE_ID) 
    });
    
    if (!course) {
      console.log('❌ Course not found');
      process.exit(1);
    }
    
    console.log('✅ Course found');
    console.log('\n📋 Current Course Status:');
    console.log(`   - Title: ${course.title?.en || course.title}`);
    console.log(`   - Status: ${course.status}`);
    console.log(`   - Is Public: ${course.isPublic}`);
    console.log(`   - Last Modified: ${course.updatedAt}`);
    
    // Reactivate the course
    console.log('\n🔧 Reactivating course...');
    await db.collection('courses').updateOne(
      { _id: new ObjectId(COURSE_ID) },
      { 
        $set: { 
          status: 'active',
          isPublic: true,
          requiresApproval: false,
          updatedAt: new Date(),
          lastModifiedBy: 'reactivation-fix'
        }
      }
    );
    
    console.log('✅ Course reactivated');
    
    // Verify reactivation
    const updatedCourse = await db.collection('courses').findOne({ 
      _id: new ObjectId(COURSE_ID) 
    });
    
    console.log('\n✅ Reactivated Course Status:');
    console.log(`   - Status: ${updatedCourse.status}`);
    console.log(`   - Is Public: ${updatedCourse.isPublic}`);
    console.log(`   - Should be accessible: ✅ YES`);
    
    console.log('\n🎉 Course reactivation completed!');
    console.log('===============================');
    console.log('✅ Course should now be accessible for editing');
    console.log('🚀 Try refreshing the admin course edit page');
    
    console.log('\n💡 To prevent accidental deactivation:');
    console.log('   1. Add confirmation dialog for deactivation');
    console.log('   2. Make deactivation require admin approval');
    console.log('   3. Add undo deactivation feature');
    
  } catch (error) {
    console.error('❌ Reactivation failed:', error.message);
    console.error(error.stack);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 Database connection closed');
    }
  }
}

if (require.main === module) {
  console.log('🔧 Course Reactivation Tool');
  console.log('============================');
  reactivateCourse();
}

module.exports = { reactivateCourse };
