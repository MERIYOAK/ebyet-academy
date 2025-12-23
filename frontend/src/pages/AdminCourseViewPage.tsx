import React, { useState, useEffect } from 'react';
import { buildApiUrl } from '../config/environment';

import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Users, Calendar, DollarSign, Eye, Play, Plus, Upload, Settings, BookOpen } from 'lucide-react';

interface Course {
  _id: string;
  title: string;
  description: string;
  price: number;
  status: 'active' | 'inactive' | 'archived';
  thumbnailURL?: string;
  totalEnrollments: number;
  createdAt: string;
  updatedAt: string;
  slug: string;
  category?: string;
  tags?: string[];
  videos?: any[];
  currentVersion?: {
    videos?: any[];
    [key: string]: any;
  };
}

const AdminCourseViewPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'videos'>('overview');

  // Fetch course details
  const fetchCourse = async () => {
    try {
      setLoading(true);
      const adminToken = localStorage.getItem('adminToken');
      
      if (!adminToken) {
        throw new Error('Admin token not found');
      }

      const response = await fetch(buildApiUrl(`/api/courses/${courseId}`), {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch course');
      }

      const data = await response.json();
      // Course data received successfully
      
      setCourse(data.data.course);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch course');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (courseId) {
      fetchCourse();
    }
  }, [courseId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-yellow-100 text-yellow-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading course details...</p>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="bg-cyan-500/20 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Settings className="h-8 w-8 text-cyan-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Course Not Found</h3>
          <p className="text-orange-400 mb-6">{error || 'The course you are looking for does not exist.'}</p>
          <Link
            to="/admin/courses"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-500 hover:to-blue-500 transition-colors duration-200"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Courses
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pt-16">
      {/* Enhanced Header */}
      <div className="bg-gray-800 shadow-lg border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                to="/admin/courses"
                className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors duration-200"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Courses
              </Link>
              <div className="h-8 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{course.title}</h1>
                <p className="text-gray-600 mt-1">Course Management Dashboard</p>
              </div>
            </div>
            <div className="flex space-x-3">
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: Eye },
              { id: 'videos', label: 'Videos', icon: Play }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4 inline mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Course Image */}
              <div className="bg-gray-800 rounded-xl shadow-sm border overflow-hidden">
                <div className="aspect-video bg-gray-200 relative overflow-hidden">
                  {course.thumbnailURL ? (
                    <>
                      {/* Loading state */}
                      <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
                        <div className="animate-pulse w-8 h-8 bg-gray-300 rounded"></div>
                      </div>
                      {/* Actual image */}
                      <img
                        src={course.thumbnailURL}
                        alt={course.title}
                        className="w-full h-full object-cover relative z-10"
                        onLoad={(e) => {
                          // Hide loading state when image loads
                          const target = e.target as HTMLImageElement;
                          const loadingState = target.parentElement?.querySelector('.animate-pulse') as HTMLElement;
                          if (loadingState) {
                            loadingState.style.display = 'none';
                          }
                        }}
                        onError={(e) => {
                          // Fallback to placeholder on error
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const placeholder = target.parentElement?.querySelector('.thumbnail-placeholder') as HTMLElement;
                          if (placeholder) {
                            placeholder.style.display = 'flex';
                          }
                          // Hide loading state
                          const loadingState = target.parentElement?.querySelector('.animate-pulse') as HTMLElement;
                          if (loadingState) {
                            loadingState.style.display = 'none';
                          }
                        }}
                      />
                    </>
                  ) : null}
                  {/* Placeholder for missing or failed thumbnails */}
                  <div 
                    className={`thumbnail-placeholder w-full h-full flex items-center justify-center ${course.thumbnailURL ? 'hidden' : 'flex'}`}
                  >
                    <div className="text-center">
                      <div className="w-12 h-12 bg-gray-300 rounded-lg flex items-center justify-center mx-auto mb-2">
                        <BookOpen className="h-6 w-6 text-gray-500" />
                      </div>
                      <span className="text-gray-400 text-sm">No thumbnail</span>
                    </div>
                  </div>
                  <div className="absolute top-4 right-4 z-20">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(course.status)}`}>
                      {course.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Course Description */}
              <div className="bg-gray-800 rounded-xl shadow-sm border p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Description</h2>
                <p className="text-gray-700 leading-relaxed">{course.description}</p>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Course Stats */}
              <div className="bg-gray-800 rounded-xl shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Course Statistics</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <DollarSign className="h-5 w-5 text-green-600 mr-2" />
                      <span className="text-gray-700">Price</span>
                    </div>
                    <span className="font-semibold text-gray-900">${course.price || 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <Users className="h-5 w-5 text-blue-600 mr-2" />
                      <span className="text-gray-700">Enrollments</span>
                    </div>
                    <span className="font-semibold text-gray-900">{course.totalEnrollments || 0}</span>
                  </div>

                </div>
              </div>

              {/* Course Details */}
              <div className="bg-gray-800 rounded-xl shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Course Details</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Course ID</label>
                    <p className="text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded">{course._id}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Slug</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{course.slug}</p>
                  </div>
                  {course.category && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Category</label>
                      <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{course.category}</p>
                    </div>
                  )}
                  {course.tags && course.tags.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Tags</label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {course.tags.map((tag, index) => (
                          <span
                            key={`${course._id}-tag-${index}`}
                            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Timestamps */}
              <div className="bg-gray-800 rounded-xl shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Timestamps</h2>
                <div className="space-y-4">
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Created</p>
                      <p className="text-sm text-gray-900">{formatDate(course.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Last Updated</p>
                      <p className="text-sm text-gray-900">{formatDate(course.updatedAt)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'videos' && (
          <div className="bg-gray-800 rounded-xl shadow-sm border">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Course Videos</h2>
                  <p className="text-gray-600 mt-1">Manage video content for this course</p>
                </div>
                <div className="flex space-x-3">
                  <Link
                    to={`/admin/upload`}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 transition-colors duration-200"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Video
                  </Link>
                  <Link
                    to={`/admin/upload`}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-gray-800 hover:bg-gray-50 transition-colors duration-200"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Bulk Upload
                  </Link>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              {(() => {
                // Get videos from either course.videos or course.currentVersion.videos
                const videos = course.videos || course.currentVersion?.videos || [];
                console.log('Videos to render:', videos);
                
                return videos.length > 0 ? (
                  <div className="space-y-4">
                    {videos.map((video: any, index: number) => {
                      // Debug logging
                      console.log('Video object:', video);
                      
                      // Handle case where video is just an ID string
                      let videoId, videoTitle, videoDuration, videoDescription;
                      
                      if (typeof video === 'string') {
                        // Video is just an ID string
                        videoId = video;
                        videoTitle = `Video ${index + 1}`;
                        videoDuration = 'Duration not available';
                        videoDescription = null;
                        console.log('Video is string ID:', videoId);
                      } else if (video && typeof video === 'object') {
                        // Video is an object
                        videoId = video._id || video.id || `video-${index}`;
                        videoTitle = video.title || `Video ${index + 1}`;
                        videoDuration = video.duration || 'Duration not available';
                        videoDescription = video.description || null;
                        console.log('Video is object, ID:', videoId);
                      } else {
                        // Fallback
                        videoId = `video-${index}`;
                        videoTitle = `Video ${index + 1}`;
                        videoDuration = 'Duration not available';
                        videoDescription = null;
                        console.log('Video is unknown type, using fallback');
                      }
                      
                      return (
                        <div key={videoId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center justify-center w-12 h-12 bg-cyan-500/20 rounded-lg">
                              <Play className="h-6 w-6 text-cyan-400" />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                                <h3 className="font-medium text-gray-900">{videoTitle}</h3>
                              </div>
                              <p className="text-sm text-gray-500 mt-1">
                                {videoDuration}
                              </p>
                              {videoDescription && (
                                <p className="text-sm text-gray-600 mt-2 bg-blue-50 p-2 rounded border-l-2 border-blue-200">
                                  <strong className="text-gray-700">Description:</strong> {videoDescription}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {videoId && videoId !== `video-${index}` ? (
                              <Link
                                to={`/admin/courses/${course._id}/videos/${videoId}`}
                                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-gray-800 hover:bg-gray-50 transition-colors duration-200"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Link>
                            ) : (
                              <button
                                disabled
                                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-400 bg-gray-100 cursor-not-allowed"
                                title="Video ID not available"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="mx-auto h-16 w-16 text-gray-400 mb-4">
                      <Play className="h-16 w-16" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No videos yet</h3>
                    <p className="text-gray-500 mb-6">Get started by adding your first video to this course.</p>
                    <Link
                      to={`/admin/upload`}
                      className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 transition-colors duration-200"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Add First Video
                    </Link>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminCourseViewPage; 