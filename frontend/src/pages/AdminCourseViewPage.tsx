import React, { useState, useEffect } from 'react';
import { buildApiUrl } from '../config/environment';

import { useParams, Link } from 'react-router-dom';
import { Users, Calendar, DollarSign, Eye, Play, Plus, Settings, BookOpen, FileText, Download, ExternalLink } from 'lucide-react';
import { getEnglishText } from '../utils/bilingualHelper';

interface Course {
  _id: string;
  title: string | { en: string; tg: string };
  description: string | { en: string; tg: string };
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
  const [activeTab, setActiveTab] = useState<'overview' | 'videos' | 'materials'>('overview');
  const [materials, setMaterials] = useState<any[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);

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
      
      // Ensure we're using the course object, not currentVersion
      const courseData = data.data.course;
      
      // If course doesn't have title/description, use currentVersion's (fallback)
      if (!courseData.title && data.data.currentVersion?.title) {
        courseData.title = data.data.currentVersion.title;
      }
      if (!courseData.description && data.data.currentVersion?.description) {
        courseData.description = data.data.currentVersion.description;
      }
      
      // Get the current version number from the API response
      // Priority: currentVersion.versionNumber > course.currentVersion > course.version > 1
      if (data.data.currentVersion?.versionNumber) {
        courseData.currentVersion = data.data.currentVersion.versionNumber;
      } else if (courseData.currentVersion) {
        // Already set, keep it
      } else if (courseData.version) {
        courseData.currentVersion = courseData.version;
      } else {
        courseData.currentVersion = 1; // Default to version 1
      }
      
      console.log('Course data set:', {
        courseId: courseData._id,
        currentVersion: courseData.currentVersion,
        version: courseData.version,
        hasCurrentVersionObj: !!data.data.currentVersion,
        currentVersionFromAPI: data.data.currentVersion?.versionNumber
      });
      
      setCourse(courseData);
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

  // Fetch materials
  const fetchMaterials = async () => {
    if (!courseId || !course) return;
    
    try {
      setLoadingMaterials(true);
      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) return;

      // Use currentVersion from course, or default to 1 for new courses
      // Ensure version is a number
      const version = Number(course.currentVersion || course.version || 1);
      console.log('Fetching materials for course:', {
        courseId,
        version,
        currentVersion: course.currentVersion,
        courseVersion: course.version,
        courseObject: course
      });
      
      const response = await fetch(buildApiUrl(`/api/materials/course/${courseId}?version=${version}`), {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Materials fetched:', {
          success: data.success,
          count: data.data?.materials?.length || 0,
          materials: data.data?.materials,
          versionUsed: version
        });
        setMaterials(data.data?.materials || []);
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Failed to fetch materials:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          versionUsed: version,
          courseId
        });
        setMaterials([]);
      }
    } catch (err) {
      console.error('Failed to fetch materials:', err);
      setMaterials([]);
    } finally {
      setLoadingMaterials(false);
    }
  };

  useEffect(() => {
    if (course && activeTab === 'materials') {
      fetchMaterials();
    }
  }, [course, activeTab, courseId]);

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
      case 'active': return 'bg-green-500/20 text-green-300';
      case 'inactive': return 'bg-yellow-500/20 text-yellow-300';
      case 'archived': return 'bg-gray-500/20 text-gray-300';
      default: return 'bg-gray-500/20 text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-gray-300 text-lg">Loading course details...</p>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="bg-cyan-500/20 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Settings className="h-8 w-8 text-cyan-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Course Not Found</h3>
          <p className="text-orange-400 mb-6">{error || 'The course you are looking for does not exist.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 pt-16">
      {/* Enhanced Header */}
      <div className="bg-gray-800 shadow-lg border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-3xl font-bold text-white">{getEnglishText(course.title)}</h1>
                <p className="text-gray-400 mt-1">Course Management Dashboard</p>
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
              { id: 'videos', label: 'Videos', icon: Play },
              { id: 'materials', label: 'Materials', icon: FileText }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === tab.id
                    ? 'border-cyan-500 text-cyan-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
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
              <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700 overflow-hidden">
                <div className="aspect-video bg-gray-700 relative overflow-hidden">
                  {course.thumbnailURL ? (
                    <>
                      {/* Loading state */}
                      <div className="absolute inset-0 bg-gray-700 flex items-center justify-center">
                        <div className="animate-pulse w-8 h-8 bg-gray-600 rounded"></div>
                      </div>
                      {/* Actual image */}
                      <img
                        src={course.thumbnailURL}
                        alt={getEnglishText(course.title)}
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
                      <div className="w-12 h-12 bg-gray-600 rounded-lg flex items-center justify-center mx-auto mb-2">
                        <BookOpen className="h-6 w-6 text-gray-400" />
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
              <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700 p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Description</h2>
                <p className="text-gray-300 leading-relaxed">{getEnglishText(course.description)}</p>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Course Stats */}
              <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Course Statistics</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                    <div className="flex items-center">
                      <DollarSign className="h-5 w-5 text-green-400 mr-2" />
                      <span className="text-gray-300">Price</span>
                    </div>
                    <span className="font-semibold text-white">${course.price || 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                    <div className="flex items-center">
                      <Users className="h-5 w-5 text-blue-400 mr-2" />
                      <span className="text-gray-300">Enrollments</span>
                    </div>
                    <span className="font-semibold text-white">{course.totalEnrollments || 0}</span>
                  </div>

                </div>
              </div>

              {/* Course Details */}
              <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Course Details</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300">Course ID</label>
                    <p className="text-sm text-gray-200 font-mono bg-gray-700/50 p-2 rounded border border-gray-600">{course._id}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300">Slug</label>
                    <p className="text-sm text-gray-200 bg-gray-700/50 p-2 rounded border border-gray-600">{course.slug}</p>
                  </div>
                  {course.category && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300">Category</label>
                      <p className="text-sm text-gray-200 bg-gray-700/50 p-2 rounded border border-gray-600">{course.category}</p>
                    </div>
                  )}
                  {course.tags && course.tags.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300">Tags</label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {course.tags.map((tag, index) => (
                          <span
                            key={`${course._id}-tag-${index}`}
                            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300"
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
              <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Timestamps</h2>
                <div className="space-y-4">
                  <div className="flex items-center p-3 bg-gray-700/50 rounded-lg">
                    <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-300">Created</p>
                      <p className="text-sm text-gray-200">{formatDate(course.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center p-3 bg-gray-700/50 rounded-lg">
                    <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-300">Last Updated</p>
                      <p className="text-sm text-gray-200">{formatDate(course.updatedAt)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'videos' && (
          <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <div>
                <h2 className="text-xl font-semibold text-white">Course Videos</h2>
                <p className="text-gray-400 mt-1">Manage video content for this course</p>
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
                        
                        // Parse title if it's a JSON string
                        let titleData = video.title;
                        if (typeof titleData === 'string' && (titleData.startsWith('{') || titleData.startsWith('"'))) {
                          try {
                            titleData = JSON.parse(titleData);
                          } catch (e) {
                            // Not JSON, use as is
                          }
                        }
                        // Always extract English text, handle both string and bilingual object formats
                        const titleText = titleData ? getEnglishText(titleData) : '';
                        videoTitle = titleText || `Video ${index + 1}`;
                        
                        videoDuration = video.duration || 'Duration not available';
                        
                        // Parse description if it's a JSON string
                        let descData = video.description;
                        if (descData && typeof descData === 'string' && (descData.startsWith('{') || descData.startsWith('"'))) {
                          try {
                            descData = JSON.parse(descData);
                          } catch (e) {
                            // Not JSON, use as is
                          }
                        }
                        // Always extract English text for description
                        const descText = descData ? getEnglishText(descData) : '';
                        videoDescription = descText || null;
                        
                        console.log('Video is object, ID:', videoId, 'Title:', videoTitle);
                      } else {
                        // Fallback
                        videoId = `video-${index}`;
                        videoTitle = `Video ${index + 1}`;
                        videoDuration = 'Duration not available';
                        videoDescription = null;
                        console.log('Video is unknown type, using fallback');
                      }
                      
                      return (
                        <div key={videoId} className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors duration-200 border border-gray-600">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center justify-center w-12 h-12 bg-cyan-500/20 rounded-lg">
                              <Play className="h-6 w-6 text-cyan-400" />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-400">#{index + 1}</span>
                                <h3 className="font-medium text-white">{videoTitle}</h3>
                              </div>
                              <p className="text-sm text-gray-400 mt-1">
                                {videoDuration}
                              </p>
                              {videoDescription && (
                                <p className="text-sm text-gray-300 mt-2 bg-blue-500/10 p-2 rounded border-l-2 border-blue-500/50">
                                  <strong className="text-gray-200">Description:</strong> {videoDescription}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {videoId && videoId !== `video-${index}` ? (
                              <Link
                                to={`/admin/courses/${course._id}/videos/${videoId}`}
                                className="inline-flex items-center px-3 py-2 border border-gray-600 text-sm font-medium rounded-lg text-gray-300 bg-gray-800 hover:bg-gray-700 transition-colors duration-200"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Link>
                            ) : (
                              <button
                                disabled
                                className="inline-flex items-center px-3 py-2 border border-gray-600 text-sm font-medium rounded-lg text-gray-500 bg-gray-700 cursor-not-allowed"
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
                    <div className="mx-auto h-16 w-16 text-gray-500 mb-4">
                      <Play className="h-16 w-16" />
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">No videos yet</h3>
                    <p className="text-gray-400 mb-6">Get started by adding your first video to this course.</p>
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

        {activeTab === 'materials' && (
          <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <div>
                <h2 className="text-xl font-semibold text-white">Course Materials</h2>
                <p className="text-gray-400 mt-1">Supplementary materials for this course</p>
              </div>
            </div>
            
            <div className="p-6">
              {loadingMaterials ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading materials...</p>
                </div>
              ) : materials.length > 0 ? (
                <div className="space-y-4">
                  {materials.map((material: any, index: number) => (
                    <div key={material.id || `material-${index}`} className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors duration-200 border border-gray-600">
                      <div className="flex items-center space-x-4 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-gray-600 rounded-lg flex items-center justify-center">
                            <FileText className="h-6 w-6 text-gray-300" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-white truncate">{getEnglishText(material.title)}</h3>
                          <div className="flex items-center space-x-4 mt-1 text-sm text-gray-400">
                            <span>{material.formattedSize || `${(material.fileSize / 1024).toFixed(2)} KB`}</span>
                            <span>•</span>
                            <span>{material.fileType?.type || 'File'}</span>
                            {material.fileExtension && (
                              <>
                                <span>•</span>
                                <span className="uppercase">{material.fileExtension}</span>
                              </>
                            )}
                          </div>
                          {material.description && (
                            <p className="text-sm text-gray-300 mt-2 bg-gray-800 p-2 rounded">
                                <strong className="text-gray-200">Description:</strong> {getEnglishText(material.description)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        {material.downloadUrl && (
                          <a
                            href={material.downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-lg text-gray-300 bg-gray-800 hover:bg-gray-700 transition-colors duration-200"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No materials yet</h3>
                  <p className="text-gray-400 mb-6">Add course materials like PDFs, spreadsheets, or documents.</p>
                  <Link
                    to={`/admin/courses/${course._id}/edit`}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-lg hover:from-cyan-500 hover:to-blue-500 transition-colors duration-200"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Add Materials
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminCourseViewPage; 