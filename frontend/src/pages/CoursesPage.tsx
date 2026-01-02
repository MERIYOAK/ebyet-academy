import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import CourseCard from '../components/CourseCard';
import LoadingMessage from '../components/LoadingMessage';
import { Search, Filter, X } from 'lucide-react';
import { useCourses, CourseFilters, ApiCourse } from '../hooks/useCourses';
import { parseDurationToSeconds } from '../utils/durationFormatter';


const CoursesPage: React.FC = () => {
  const { t } = useTranslation();
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [priceRange, setPriceRange] = useState<string>('');
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [goToPageInput, setGoToPageInput] = useState<string>('');
  
  // Build filters for React Query
  const filters: CourseFilters = useMemo(() => ({
    page: currentPage,
    limit: itemsPerPage,
    search: searchTerm,
    category: selectedCategory,
    level: selectedLevel,
    tag: selectedTag,
    priceRange: priceRange,
  }), [currentPage, itemsPerPage, searchTerm, selectedCategory, selectedLevel, selectedTag, priceRange]);
  
  // Use React Query for fetching courses from backend
  const { 
    data: coursesResponse, 
    isLoading: loading, 
    error,
    refetch 
  } = useCourses(filters);
  
  // Extract courses from API response
  const courses: ApiCourse[] = useMemo(() => {
    if (coursesResponse?.courses) {
      return coursesResponse.courses;
    }
    return [];
  }, [coursesResponse]);
  
  // Calculate pagination from API response
  const totalPages = useMemo(() => {
    return coursesResponse?.pagination?.pages || 1;
  }, [coursesResponse?.pagination?.pages]);
  
  const totalItems = useMemo(() => {
    return coursesResponse?.pagination?.total || courses.length;
  }, [coursesResponse?.pagination?.total, courses.length]);

  // Use courses directly - filtering is handled server-side
  const displayedCourses = courses;

  // Check if user is authenticated - immediate check
  useEffect(() => {
    const token = localStorage.getItem('token');
    console.log('🔍 [CoursesPage] Authentication check:', {
      hasToken: !!token,
      tokenLength: token?.length || 0
    });
  }, []);

  // Handle refetch when filters change
  const handleRefetch = useCallback(() => {
    refetch();
  }, [refetch]);

  // Handle pagination changes
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page
    setGoToPageInput(''); // Clear input
  };

  // Handle "Go to page" input
  const handleGoToPage = useCallback(() => {
    const page = parseInt(goToPageInput);
    if (page >= 1 && page <= totalPages) {
      handlePageChange(page);
    } else {
      setGoToPageInput(''); // Clear invalid input
    }
  }, [goToPageInput, totalPages, handlePageChange]);

  const handleGoToPageKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleGoToPage();
    }
  };

  // Handle search and filter changes
  const handleSearchChange = (newSearchTerm: string) => {
    setSearchTerm(newSearchTerm);
    setCurrentPage(1); // Reset to first page
  };

  const handleCategoryChange = (newCategory: string) => {
    setSelectedCategory(newCategory);
    setCurrentPage(1); // Reset to first page
  };

  const handleLevelChange = (newLevel: string) => {
    setSelectedLevel(newLevel);
    setCurrentPage(1); // Reset to first page
  };

  const handleTagChange = (newTag: string) => {
    setSelectedTag(newTag);
    setCurrentPage(1); // Reset to first page
  };

  const handlePriceRangeChange = (newPriceRange: string) => {
    setPriceRange(newPriceRange);
    setCurrentPage(1); // Reset to first page
  };

  // Listen for course creation events to refetch
  useEffect(() => {
    const onCreated = () => {
      handleRefetch();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleRefetch();
      }
    };
    window.addEventListener('course:created', onCreated as EventListener);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('course:created', onCreated as EventListener);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [handleRefetch]);


  // Get unique categories and levels for dropdowns
  const categories = useMemo(() => {
    // Predefined categories in the order we want them to appear
    const predefinedCategories = ['crypto', 'investing', 'trading', 'stock-market', 'etf', 'option-trading'];
    
    // Category mapping from old to new values
    const categoryMapping: Record<string, string> = {
      'youtube mastering': 'youtube',
      'video editing': 'video',
      'camera': 'camera',
      'trading': 'trading',
      'investing': 'investing'
    };
    
    // Get categories from API courses and map them to new values
    const existingCategories = [...new Set(courses.map(course => {
      const category = course.category ?? '';
      return categoryMapping[category] || category;
    }).filter(Boolean))];
    
    // Combine predefined categories with existing ones, maintaining order
    const allCategories = [...predefinedCategories];
    
    // Add any additional categories from courses that aren't in our predefined list
    existingCategories.forEach(category => {
      if (!predefinedCategories.includes(category)) {
        allCategories.push(category);
      }
    });
    
    return allCategories;
  }, [courses]);

  const levels = useMemo(() => {
    // Predefined levels that should always be available
    const predefinedLevels = ['beginner', 'intermediate', 'advanced'];
    
    // Get levels from courses
    const courseLevels = [
      ...new Set(
        courses
          .map(course => course.level)
          .filter((level): level is string => typeof level === 'string' && level.length > 0)
      )
    ];
    
    // Combine predefined with course levels, maintaining order
    const allLevels = [...predefinedLevels];
    
    // Add any additional levels from courses that aren't in predefined list
    courseLevels.forEach(level => {
      if (!predefinedLevels.includes(level)) {
        allLevels.push(level);
      }
    });
    
    return allLevels;
  }, [courses]);

  const tags = useMemo(() => {
    const allTags = courses.flatMap(course => course.tags || []);
    const uniqueTags = [...new Set(allTags)];
    return uniqueTags.sort();
  }, [courses]);

  // Clear all filters
  const clearFilters = () => {
    handleSearchChange('');
    handleCategoryChange('');
    handleLevelChange('');
    handleTagChange('');
    handlePriceRangeChange('');
  };

  // Handle purchase success
  const handlePurchaseSuccess = useCallback(() => {
    // Refresh purchase status after successful purchase
    // This function is no longer needed as purchase status is handled by backend
  }, []);

  const content = useMemo(() => {
    // Rendering content
    
    if (loading) {
      return (
        <div>
          <LoadingMessage 
            message={t('courses.loading_courses', 'Loading courses, please wait...')}
            className="mb-8"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 tiny:gap-4 xs:gap-6 sm:gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-800 rounded-2xl shadow-lg p-3 tiny:p-4 sm:p-6 h-56 tiny:h-64 sm:h-72 border border-gray-700" />
            ))}
          </div>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="text-center py-12">
          <div className="bg-red-900/20 text-red-400 border border-red-500/30 rounded-lg p-6 max-w-md mx-auto">
            <h3 className="text-lg font-semibold mb-2">{t('courses.error_loading', 'Failed to load courses')}</h3>
            <p className="text-sm mb-4 text-gray-300">{error.message}</p>
            <button
              onClick={handleRefetch}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {t('common.retry', 'Try Again')}
            </button>
          </div>
        </div>
      );
    }
    
    if (!displayedCourses.length) {
      return (
        <div className="text-center text-gray-400 py-8 tiny:py-12 sm:py-16 md:py-20 text-xs tiny:text-sm sm:text-base">
          {totalItems === 0 ? t('courses.no_courses_available') : t('courses.no_courses_match')}
        </div>
      );
    }
    
    // Rendering course grid
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 tiny:gap-4 xs:gap-6 sm:gap-8">
        {displayedCourses.map((c) => {
          // Using the centralized parseDurationToSeconds utility
          const totalSeconds = (c.videos || []).reduce((acc, v) => acc + parseDurationToSeconds(v.duration), 0);
          return (
          <CourseCard
            key={c._id}
            id={c._id}
            title={c.title}
            description={c.description}
            thumbnail={c.thumbnailURL || ''}
            price={c.price}
            duration={`${totalSeconds}`}
            students={c.totalEnrollments || 0}
            lessons={(c.videos || []).length}
            instructor={t('brand.name')}
            tags={c.tags || []}
            onPurchaseSuccess={handlePurchaseSuccess}
            isPurchased={c.isPurchased || false}
            progress={c.isPurchased ? (c.progress || 0) : undefined}
            totalLessons={c.isPurchased ? (c.totalLessons || (c.videos || []).length) : undefined}
            completedLessons={c.isPurchased ? (c.completedLessons || 0) : undefined}
            isCompleted={c.isPurchased ? (c.isCompleted || false) : undefined}
          />
        );})}
      </div>
    );
  }, [displayedCourses, loading, error, totalItems, handlePurchaseSuccess, handleRefetch, t]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white pt-12 tiny:pt-16 sm:pt-20 md:pt-24 pb-4 tiny:pb-6 sm:pb-8 md:pb-12">
      <div className="max-w-7xl mx-auto px-2 tiny:px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="text-center mb-4 tiny:mb-6 sm:mb-8 md:mb-12">
          <h1 className="text-lg tiny:text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-1.5 tiny:mb-2 sm:mb-3 md:mb-4 pb-1 tiny:pb-2 sm:pb-3 md:pb-4">
            {t('courses.page_title_all')}
          </h1>
          <p className="text-[10px] tiny:text-xs sm:text-base md:text-lg lg:text-xl text-gray-600 dark:text-gray-300">
            {t('courses.page_subtitle')}
          </p>
        </div>

        {/* New Search and Filter Section - Compact Horizontal Layout */}
        <div className="mb-4 tiny:mb-6 sm:mb-8 md:mb-12">
          {/* Unified Search and Filter Bar */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl tiny:rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700/30 overflow-hidden backdrop-blur-xl">
            {/* Top Row: Search and Quick Actions */}
            <div className="p-3 tiny:p-4 sm:p-5 md:p-6 border-b border-gray-200 dark:border-gray-700/50">
              <div className="flex flex-col lg:flex-row gap-3 tiny:gap-4 items-start lg:items-center">
                {/* Search Input - Takes full width on mobile, flex on desktop */}
                <div className="flex-1 w-full lg:w-auto min-w-0">
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 rounded-xl tiny:rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative flex items-center bg-gray-100 dark:bg-gray-900/60 border-2 border-gray-300 dark:border-gray-700/40 rounded-xl tiny:rounded-2xl px-3 tiny:px-4 py-2 tiny:py-3 focus-within:border-cyan-500 dark:focus-within:border-cyan-500/60 focus-within:bg-gray-50 dark:focus-within:bg-gray-900/80 transition-all duration-300">
                      <Search className="h-4 w-4 tiny:h-5 tiny:w-5 text-gray-600 dark:text-cyan-400/70 mr-2 tiny:mr-3 flex-shrink-0" />
                      <input
                        type="text"
                        placeholder={t('courses.search_placeholder')}
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none text-xs tiny:text-sm sm:text-base"
                      />
                      {searchTerm && (
                        <button
                          onClick={() => handleSearchChange('')}
                          className="ml-1 tiny:ml-2 p-0.5 tiny:p-1 text-gray-500 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all duration-200"
                        >
                          <X className="h-3.5 w-3.5 tiny:h-4 tiny:w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Filter Pills - Horizontal Scrollable */}
                <div className="flex items-center gap-1.5 tiny:gap-2 lg:gap-3 flex-wrap lg:flex-nowrap lg:ml-4 w-full lg:w-auto">
                  {/* Category Quick Filters */}
                  <div className="flex items-center gap-1.5 tiny:gap-2 overflow-x-auto scrollbar-hide pb-1 lg:pb-0 flex-1 lg:flex-initial min-w-0">
                    <button
                      onClick={() => handleCategoryChange('')}
                      className={`px-2.5 tiny:px-3 py-1 tiny:py-1.5 rounded-full text-[10px] tiny:text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200 flex-shrink-0 ${
                        !selectedCategory
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/30'
                          : 'bg-gray-200 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600/50'
                      }`}
                    >
                      {t('courses.filter_all')}
                    </button>
                    {categories.slice(0, 4).map(category => (
                      <button
                        key={category}
                        onClick={() => handleCategoryChange(category)}
                        className={`px-2.5 tiny:px-3 py-1 tiny:py-1.5 rounded-full text-[10px] tiny:text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200 flex-shrink-0 ${
                          selectedCategory === category
                            ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/30'
                            : 'bg-gray-200 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600/50'
                        }`}
                      >
                        {t(`categories.${category}`)}
                      </button>
                    ))}
                  </div>

                  {/* Filter Toggle Button */}
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`px-3 tiny:px-4 py-1.5 tiny:py-2 rounded-lg tiny:rounded-xl text-[10px] tiny:text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 tiny:gap-2 whitespace-nowrap flex-shrink-0 ${
                      showFilters
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/40'
                        : 'bg-gray-200 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600/50'
                    }`}
                  >
                    <Filter className="h-3.5 w-3.5 tiny:h-4 tiny:w-4" />
                    <span className="hidden xs:inline">{showFilters ? t('common.close') : t('common.filter')}</span>
                  </button>

                  {/* Clear Filters Button */}
                  {(searchTerm || selectedCategory || selectedLevel || selectedTag || priceRange) && (
                    <button
                      onClick={clearFilters}
                      className="px-2.5 tiny:px-3 py-1.5 tiny:py-2 rounded-lg tiny:rounded-xl text-[10px] tiny:text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700/50 border border-gray-300 dark:border-gray-600/50 transition-all duration-200 flex items-center gap-1 tiny:gap-1.5 flex-shrink-0"
                    >
                      <X className="h-3 w-3 tiny:h-3.5 tiny:w-3.5" />
                      <span className="hidden xs:inline">{t('common.reset')}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Expandable Filter Panel */}
            {showFilters && (
              <div className="p-3 tiny:p-4 sm:p-5 md:p-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700/30">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 tiny:gap-4">
                  {/* Category Filter */}
                  <div className="space-y-1.5 tiny:space-y-2">
                    <label className="text-[10px] tiny:text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5 tiny:gap-2">
                      <div className="w-0.5 tiny:w-1 h-3 tiny:h-4 bg-gradient-to-b from-cyan-400 to-blue-400 rounded-full"></div>
                      {t('courses.filter_category')}
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className="w-full px-2.5 tiny:px-3 py-2 tiny:py-2.5 bg-white dark:bg-gray-900/80 border border-gray-300 dark:border-gray-700/50 rounded-lg tiny:rounded-xl text-gray-900 dark:text-white text-xs tiny:text-sm focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all duration-200 appearance-none"
                    >
                      <option value="">{t('courses.filter_all')}</option>
                      {categories.map(category => (
                        <option key={category} value={category}>
                          {t(`categories.${category}`)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Level Filter */}
                  <div className="space-y-1.5 tiny:space-y-2">
                    <label className="text-[10px] tiny:text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5 tiny:gap-2">
                      <div className="w-0.5 tiny:w-1 h-3 tiny:h-4 bg-gradient-to-b from-blue-400 to-purple-400 rounded-full"></div>
                      {t('courses.filter_skill_level')}
                    </label>
                    <select
                      value={selectedLevel}
                      onChange={(e) => handleLevelChange(e.target.value)}
                      className="w-full px-2.5 tiny:px-3 py-2 tiny:py-2.5 bg-white dark:bg-gray-900/80 border border-gray-300 dark:border-gray-700/50 rounded-lg tiny:rounded-xl text-gray-900 dark:text-white text-xs tiny:text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 appearance-none"
                    >
                      <option value="">{t('courses.filter_all')}</option>
                      {levels.map(level => (
                        <option key={level} value={level}>
                          {level === 'beginner' ? t('courses.filter_beginner') :
                           level === 'intermediate' ? t('courses.filter_intermediate') :
                           level === 'advanced' ? t('courses.filter_advanced') :
                           level.charAt(0).toUpperCase() + level.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Tag Filter */}
                  <div className="space-y-1.5 tiny:space-y-2">
                    <label className="text-[10px] tiny:text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5 tiny:gap-2">
                      <div className="w-0.5 tiny:w-1 h-3 tiny:h-4 bg-gradient-to-b from-purple-400 to-pink-400 rounded-full"></div>
                      {t('courses.filter_tags')}
                    </label>
                    <select
                      value={selectedTag}
                      onChange={(e) => handleTagChange(e.target.value)}
                      className="w-full px-2.5 tiny:px-3 py-2 tiny:py-2.5 bg-white dark:bg-gray-900/80 border border-gray-300 dark:border-gray-700/50 rounded-lg tiny:rounded-xl text-gray-900 dark:text-white text-xs tiny:text-sm focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all duration-200 appearance-none"
                    >
                      <option value="">{t('courses.filter_all')}</option>
                      {tags.map(tag => (
                        <option key={tag} value={tag}>
                          #{tag}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Price Range Filter */}
                  <div className="space-y-1.5 tiny:space-y-2">
                    <label className="text-[10px] tiny:text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5 tiny:gap-2">
                      <div className="w-0.5 tiny:w-1 h-3 tiny:h-4 bg-gradient-to-b from-pink-400 to-cyan-400 rounded-full"></div>
                      {t('courses.filter_price_range')}
                    </label>
                    <select
                      value={priceRange}
                      onChange={(e) => handlePriceRangeChange(e.target.value)}
                      className="w-full px-2.5 tiny:px-3 py-2 tiny:py-2.5 bg-white dark:bg-gray-900/80 border border-gray-300 dark:border-gray-700/50 rounded-lg tiny:rounded-xl text-gray-900 dark:text-white text-xs tiny:text-sm focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500 transition-all duration-200 appearance-none"
                    >
                      <option value="">{t('courses.price_all')}</option>
                      <option value="free">{t('courses.price_free')}</option>
                      <option value="under-50">{t('courses.price_under_50')}</option>
                      <option value="50-100">{t('courses.price_50_100')}</option>
                      <option value="over-100">{t('courses.price_over_100')}</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Active Filters Display - Inline with search bar */}
            {(searchTerm || selectedCategory || selectedLevel || selectedTag || priceRange) && (
              <div className="px-3 tiny:px-4 sm:px-5 md:px-6 py-2 tiny:py-3 bg-gray-100 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700/30">
                <div className="flex items-center flex-wrap gap-1.5 tiny:gap-2">
                  <span className="text-[10px] tiny:text-xs font-semibold text-gray-600 dark:text-gray-500 uppercase tracking-wide mr-0.5 tiny:mr-1">{t('courses.filtered_by')}:</span>
                  {searchTerm && (
                    <span className="inline-flex items-center px-2 tiny:px-2.5 py-0.5 tiny:py-1 bg-cyan-500/20 text-cyan-300 rounded-md tiny:rounded-lg text-[10px] tiny:text-xs font-medium border border-cyan-500/30">
                      <Search className="h-2.5 w-2.5 tiny:h-3 tiny:w-3 mr-0.5 tiny:mr-1" />
                      <span className="truncate max-w-[100px] tiny:max-w-none">"{searchTerm}"</span>
                    </span>
                  )}
                  {selectedCategory && (
                    <span className="inline-flex items-center px-2 tiny:px-2.5 py-0.5 tiny:py-1 bg-blue-500/20 text-blue-300 rounded-md tiny:rounded-lg text-[10px] tiny:text-xs font-medium border border-blue-500/30">
                      {t(`categories.${selectedCategory}`)}
                    </span>
                  )}
                  {selectedLevel && (
                    <span className="inline-flex items-center px-2 tiny:px-2.5 py-0.5 tiny:py-1 bg-green-500/20 text-green-300 rounded-md tiny:rounded-lg text-[10px] tiny:text-xs font-medium border border-green-500/30">
                      {selectedLevel === 'beginner' ? t('courses.filter_beginner') :
                       selectedLevel === 'intermediate' ? t('courses.filter_intermediate') :
                       selectedLevel === 'advanced' ? t('courses.filter_advanced') :
                       selectedLevel.charAt(0).toUpperCase() + selectedLevel.slice(1)}
                    </span>
                  )}
                  {selectedTag && (
                    <span className="inline-flex items-center px-2 tiny:px-2.5 py-0.5 tiny:py-1 bg-orange-500/20 text-orange-300 rounded-md tiny:rounded-lg text-[10px] tiny:text-xs font-medium border border-orange-500/30">
                      #{selectedTag}
                    </span>
                  )}
                  {priceRange && (
                    <span className="inline-flex items-center px-2 tiny:px-2.5 py-0.5 tiny:py-1 bg-purple-500/20 text-purple-300 rounded-md tiny:rounded-lg text-[10px] tiny:text-xs font-medium border border-purple-500/30">
                      {priceRange === 'free' ? t('courses.price_free') : 
                       priceRange === 'under-50' ? t('courses.price_under_50') :
                       priceRange === '50-100' ? t('courses.price_50_100') : t('courses.price_over_100')}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Results Summary - Compact Design */}
          <div className="mt-3 tiny:mt-4 sm:mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 tiny:gap-3 sm:gap-4">
            <div className="flex items-center gap-2 tiny:gap-3">
              <div className="px-2.5 tiny:px-3 py-1 tiny:py-1.5 bg-white dark:bg-gray-800 rounded-md tiny:rounded-lg border border-gray-200 dark:border-gray-700/30">
                <span className="text-[10px] tiny:text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  {loading ? (
                    <span className="flex items-center gap-1.5 tiny:gap-2">
                      <span className="animate-spin h-2.5 w-2.5 tiny:h-3 tiny:w-3 border-2 border-cyan-400 border-t-transparent rounded-full"></span>
                      <span className="hidden xs:inline">{t('common.loading')}</span>
                    </span>
                  ) : (
                    <>
                      <span className="text-cyan-600 dark:text-cyan-400 font-bold">{displayedCourses.length}</span>
                      <span className="text-gray-500 mx-0.5 tiny:mx-1">/</span>
                      <span className="text-gray-900 dark:text-white font-semibold">{totalItems}</span>
                      <span className="text-gray-500 ml-0.5 tiny:ml-1 hidden xs:inline">{t('navbar.courses').toLowerCase()}</span>
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {content}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-6 tiny:mt-8 sm:mt-10 md:mt-12 flex flex-col space-y-3 tiny:space-y-4 sm:space-y-6">
            {/* Items per page selector and pagination info */}
            <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 tiny:space-y-3 sm:space-y-0 gap-2 tiny:gap-3">
              {/* Items per page selector */}
              <div className="flex items-center space-x-1.5 tiny:space-x-2">
                <label className="text-[10px] tiny:text-xs sm:text-sm text-gray-300 dark:text-gray-400">{t('courses.pagination.show')}:</label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
                  className="px-2 tiny:px-3 py-1 tiny:py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 rounded-md text-[10px] tiny:text-xs sm:text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                >
                  <option value={6}>{t('courses.pagination.per_page', { count: 6 })}</option>
                  <option value={12}>{t('courses.pagination.per_page', { count: 12 })}</option>
                  <option value={24}>{t('courses.pagination.per_page', { count: 24 })}</option>
                  <option value={48}>{t('courses.pagination.per_page', { count: 48 })}</option>
                </select>
              </div>

              {/* Pagination info */}
              <div className="text-[10px] tiny:text-xs sm:text-sm text-gray-600 dark:text-gray-300 text-center sm:text-left">
                {t('courses.pagination.page_info', { current: currentPage, total: totalPages, items: totalItems })}
              </div>
            </div>

            {/* Pagination buttons */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 tiny:gap-2">
              {/* Previous button */}
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-2.5 tiny:px-3 sm:px-4 py-1.5 tiny:py-2 text-[10px] tiny:text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('courses.pagination.previous')}
              </button>

              {/* Page numbers */}
              <div className="flex items-center flex-wrap gap-1 tiny:gap-1.5 sm:gap-2">
                {(() => {
                  const pages = [];
                  const maxVisiblePages = 5;
                  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                  
                  // Adjust start page if we're near the end
                  if (endPage - startPage + 1 < maxVisiblePages) {
                    startPage = Math.max(1, endPage - maxVisiblePages + 1);
                  }

                  // Add first page and ellipsis if needed
                  if (startPage > 1) {
                    pages.push(
                      <button
                        key={1}
                        onClick={() => handlePageChange(1)}
                        className="px-2 tiny:px-3 py-1.5 tiny:py-2 text-[10px] tiny:text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        1
                      </button>
                    );
                    if (startPage > 2) {
                      pages.push(
                        <span key="ellipsis1" className="px-1 tiny:px-2 text-gray-500 text-[10px] tiny:text-xs">
                          ...
                        </span>
                      );
                    }
                  }

                  // Add visible page numbers
                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(
                      <button
                        key={i}
                        onClick={() => handlePageChange(i)}
                        className={`px-2 tiny:px-3 py-1.5 tiny:py-2 text-[10px] tiny:text-xs sm:text-sm font-medium rounded-md transition-colors ${
                          i === currentPage
                            ? 'text-white bg-cyan-500 border border-cyan-500'
                            : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        {i}
                      </button>
                    );
                  }

                  // Add last page and ellipsis if needed
                  if (endPage < totalPages) {
                    if (endPage < totalPages - 1) {
                      pages.push(
                        <span key="ellipsis2" className="px-1 tiny:px-2 text-gray-500 text-[10px] tiny:text-xs">
                          ...
                        </span>
                      );
                    }
                    pages.push(
                      <button
                        key={totalPages}
                        onClick={() => handlePageChange(totalPages)}
                        className="px-2 tiny:px-3 py-1.5 tiny:py-2 text-[10px] tiny:text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        {totalPages}
                      </button>
                    );
                  }

                  return pages;
                })()}
              </div>

              {/* Next button */}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-2.5 tiny:px-3 sm:px-4 py-1.5 tiny:py-2 text-[10px] tiny:text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('courses.pagination.next')}
              </button>
            </div>

            {/* Go to page input (only show if more than 1 page) */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center space-x-1.5 tiny:space-x-2 pt-2 tiny:pt-3 border-t border-gray-200 dark:border-gray-800">
                <label className="text-[10px] tiny:text-xs sm:text-sm text-gray-600 dark:text-gray-300">{t('courses.pagination.go_to_page', 'Go to page')}:</label>
                <input
                  type="number"
                  min="1"
                  max={totalPages}
                  value={goToPageInput}
                  onChange={(e) => setGoToPageInput(e.target.value)}
                  onKeyPress={handleGoToPageKeyPress}
                  placeholder={currentPage.toString()}
                  className="w-16 tiny:w-20 px-2 tiny:px-3 py-1 tiny:py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 rounded-md text-[10px] tiny:text-xs sm:text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-center"
                />
                <button
                  onClick={handleGoToPage}
                  disabled={!goToPageInput || parseInt(goToPageInput) < 1 || parseInt(goToPageInput) > totalPages || isNaN(parseInt(goToPageInput))}
                  className="px-2.5 tiny:px-3 py-1 tiny:py-1.5 text-[10px] tiny:text-xs sm:text-sm font-medium text-white bg-cyan-600 border border-cyan-500 rounded-md hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {t('courses.pagination.go', 'Go')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CoursesPage; 