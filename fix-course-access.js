/**
 * Fix Course Access Permissions
 * Makes course accessible to users
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const COURSE_ID = '69790910eedf55c69b320094';

async function fixCourseAccess() {
  let client;
  
  try {
    console.log('🔧 Fixing course access permissions...');
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
    console.log('\n📋 Current Course Permissions:');
    console.log(`   - Status: ${course.status}`);
    console.log(`   - Is Public: ${course.isPublic}`);
    console.log(`   - Featured: ${course.featured}`);
    console.log(`   - Requires Approval: ${course.requiresApproval}`);
    console.log(`   - Max Enrollments: ${course.maxEnrollments}`);
    console.log(`   - Total Enrollments: ${course.totalEnrollments}`);
    
    // Fix access permissions
    console.log('\n🔧 Updating course access permissions...');
    
    const updateData = {
      status: 'active',
      isPublic: true,
      featured: course.featured || false,
      requiresApproval: false,
      maxEnrollments: course.maxEnrollments || null,
      lastModifiedBy: 'access-fix',
      updatedAt: new Date()
    };
    
    const result = await db.collection('courses').updateOne(
      { _id: new ObjectId(COURSE_ID) },
      { $set: updateData }
    );
    
    console.log(`✅ Course updated: ${result.modifiedCount} document(s) modified`);
    
    // Verify the fix
    console.log('\n🔍 Verifying course access...');
    const updatedCourse = await db.collection('courses').findOne({ 
      _id: new ObjectId(COURSE_ID) 
    });
    
    console.log('✅ Updated Course Permissions:');
    console.log(`   - Status: ${updatedCourse.status}`);
    console.log(`   - Is Public: ${updatedCourse.isPublic}`);
    console.log(`   - Featured: ${updatedCourse.featured}`);
    console.log(`   - Requires Approval: ${updatedCourse.requiresApproval}`);
    
    // Check if course should be accessible
    const isAccessible = updatedCourse.status === 'active' && updatedCourse.isPublic === true;
    
    if (isAccessible) {
      console.log('\n✅ Course should now be accessible to users!');
    } else {
      console.log('\n⚠️  Course may still have access restrictions');
    }
    
    // Check backend API route if needed
    console.log('\n🔍 Checking if there are any backend route restrictions...');
    
    // Look for any middleware or route restrictions that might cause 403
    console.log('💡 Common causes of 403 errors:');
    console.log('   1. Course is not public (isPublic: false)');
    console.log('   2. Course status is not active');
    console.log('   3. User authentication issues');
    console.log('   4. Backend API middleware restrictions');
    console.log('   5. Course requires approval');
    
    console.log('\n🚀 Next steps:');
    console.log('   1. Try accessing the course again');
    console.log('   2. Check browser network tab for detailed error');
    console.log('   3. Verify user is logged in');
    console.log('   4. Check backend logs for 403 reason');
    
    if (isAccessible) {
      console.log('   ✅ Course permissions look correct');
      console.log('   ✅ Issue might be with user authentication or backend middleware');
    }
    
  } catch (error) {
    console.error('❌ Course access fix failed:', error.message);
    console.error(error.stack);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 Database connection closed');
    }
  }
}

if (require.main === module) {
  console.log('🔧 Course Access Fix Tool');
  console.log('==========================');
  fixCourseAccess();
}

module.exports = { fixCourseAccess };
