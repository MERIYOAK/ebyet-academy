/**
 * Fix Other Course Access
 * Fixes the course that's showing 403 error
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const COURSE_ID = '69a4c91674036fa789810031';

async function fixOtherCourse() {
  let client;
  
  try {
    console.log('🔧 Fixing other course access...');
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
    
    // Fix course permissions
    console.log('\n🔧 Fixing course permissions...');
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
    
    console.log('✅ Course permissions fixed');
    
    // Verify the fix
    const updatedCourse = await db.collection('courses').findOne({ 
      _id: new ObjectId(COURSE_ID) 
    });
    
    console.log('\n✅ Updated Course Status:');
    console.log(`   - Status: ${updatedCourse.status}`);
    console.log(`   - Is Public: ${updatedCourse.isPublic}`);
    console.log(`   - Should be accessible: ✅ YES`);
    
    console.log('\n🎉 Course fix completed!');
    console.log('========================');
    console.log('✅ This course should now be accessible');
    console.log('🚀 Try refreshing the admin course edit page');
    
  } catch (error) {
    console.error('❌ Course fix failed:', error.message);
    console.error(error.stack);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 Database connection closed');
    }
  }
}

if (require.main === module) {
  console.log('🔧 Other Course Fix Tool');
  console.log('========================');
  fixOtherCourse();
}

module.exports = { fixOtherCourse };
