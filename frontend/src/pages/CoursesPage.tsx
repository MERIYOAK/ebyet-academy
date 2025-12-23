import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import CourseCard from '../components/CourseCard';
import LoadingMessage from '../components/LoadingMessage';
import { Search, Filter, X } from 'lucide-react';
// TEMPORARILY DISABLED: import { useCourses, CourseFilters, ApiCourse } from '../hooks/useCourses';
import { ApiCourse } from '../hooks/useCourses';
import { parseDurationToSeconds } from '../utils/durationFormatter';

// TEMPORARY: Sample courses for frontend (will be replaced with backend later)
const sampleCourses: ApiCourse[] = [
  {
    _id: 'sample-course-1',
    title: 'Introduction to Stock Market Investing',
    description: 'Learn the fundamentals of stock market investing, including how to analyze stocks, build a diversified portfolio, and make informed investment decisions. Perfect for beginners who want to start their investment journey.',
    thumbnailURL: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=600&fit=crop',
    price: 49.99,
    category: 'stock-market',
    level: 'beginner',
    totalEnrollments: 1250,
    tags: ['Investing', 'Stocks', 'Beginner'],
    videos: [
      { _id: 'v1', duration: '15:30' },
      { _id: 'v2', duration: '22:45' },
      { _id: 'v3', duration: '18:20' },
      { _id: 'v4', duration: '25:10' },
      { _id: 'v5', duration: '20:00' }
    ]
  },
  {
    _id: 'sample-course-2',
    title: 'Advanced Trading Strategies',
    description: 'Master advanced trading techniques including day trading, swing trading, and options strategies. Learn technical analysis, risk management, and how to develop your own trading system.',
    thumbnailURL: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop',
    price: 79.99,
    category: 'trading',
    level: 'advanced',
    totalEnrollments: 890,
    tags: ['Trading', 'Advanced', 'Strategies'],
    videos: [
      { _id: 'v1', duration: '30:15' },
      { _id: 'v2', duration: '28:40' },
      { _id: 'v3', duration: '35:20' },
      { _id: 'v4', duration: '32:50' },
      { _id: 'v5', duration: '29:30' },
      { _id: 'v6', duration: '27:10' }
    ]
  },
  {
    _id: 'sample-course-3',
    title: 'Cryptocurrency Investment Guide',
    description: 'Comprehensive guide to cryptocurrency investing. Learn about Bitcoin, Ethereum, altcoins, DeFi, NFTs, and how to safely store and trade digital assets. Stay ahead in the crypto market.',
    thumbnailURL: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&h=600&fit=crop',
    price: 59.99,
    category: 'crypto',
    level: 'intermediate',
    totalEnrollments: 2100,
    tags: ['Cryptocurrency', 'Bitcoin', 'Blockchain'],
    videos: [
      { _id: 'v1', duration: '18:45' },
      { _id: 'v2', duration: '24:30' },
      { _id: 'v3', duration: '20:15' },
      { _id: 'v4', duration: '22:00' },
      { _id: 'v5', duration: '19:30' }
    ]
  },
  {
    _id: 'sample-course-4',
    title: 'Real Estate Investment Fundamentals',
    description: 'Discover how to build wealth through real estate investing. Learn about property analysis, financing options, rental properties, and real estate investment strategies for long-term wealth building.',
    thumbnailURL: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=600&fit=crop',
    price: 69.99,
    category: 'investing',
    level: 'beginner',
    totalEnrollments: 1560,
    tags: ['Real Estate', 'Property', 'Investment'],
    videos: [
      { _id: 'v1', duration: '25:20' },
      { _id: 'v2', duration: '28:45' },
      { _id: 'v3', duration: '23:10' },
      { _id: 'v4', duration: '26:30' },
      { _id: 'v5', duration: '24:50' },
      { _id: 'v6', duration: '27:15' },
      { _id: 'v7', duration: '22:40' }
    ]
  },
  {
    _id: 'sample-course-5',
    title: 'ETF Investment Strategies',
    description: 'Learn professional ETF (Exchange-Traded Fund) investment strategies. Understand ETF selection, diversification techniques, risk assessment, and how to build a diversified portfolio using ETFs for maximum returns.',
    thumbnailURL: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop',
    price: 89.99,
    category: 'etf',
    level: 'intermediate',
    totalEnrollments: 980,
    tags: ['Portfolio', 'Management', 'Diversification'],
    videos: [
      { _id: 'v1', duration: '20:15' },
      { _id: 'v2', duration: '24:30' },
      { _id: 'v3', duration: '22:45' },
      { _id: 'v4', duration: '26:20' },
      { _id: 'v5', duration: '21:10' },
      { _id: 'v6', duration: '23:50' }
    ]
  },
  {
    _id: 'sample-course-6',
    title: 'Options Trading Essentials',
    description: 'Master the fundamentals of options trading. Learn about calls, puts, spreads, and advanced options strategies. Perfect for traders looking to expand their trading toolkit.',
    thumbnailURL: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop',
    price: 99.99,
    category: 'option-trading',
    level: 'advanced',
    totalEnrollments: 720,
    tags: ['Options', 'Trading', 'Derivatives'],
    videos: [
      { _id: 'v1', duration: '32:20' },
      { _id: 'v2', duration: '28:45' },
      { _id: 'v3', duration: '35:10' },
      { _id: 'v4', duration: '30:30' },
      { _id: 'v5', duration: '33:15' },
      { _id: 'v6', duration: '29:50' },
      { _id: 'v7', duration: '31:25' }
    ]
  },
  {
    _id: 'sample-course-7',
    title: 'Forex Trading for Beginners',
    description: 'Start your forex trading journey with this comprehensive beginner course. Learn currency pairs, market analysis, trading platforms, and essential risk management techniques.',
    thumbnailURL: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=600&fit=crop',
    price: 54.99,
    category: 'trading',
    level: 'beginner',
    totalEnrollments: 1340,
    tags: ['Forex', 'Currency', 'Trading'],
    videos: [
      { _id: 'v1', duration: '19:30' },
      { _id: 'v2', duration: '23:15' },
      { _id: 'v3', duration: '21:45' },
      { _id: 'v4', duration: '24:20' },
      { _id: 'v5', duration: '20:50' }
    ]
  },
  {
    _id: 'sample-course-8',
    title: 'Bond Investment Strategies',
    description: 'Understand the bond market and learn how to invest in bonds effectively. Cover government bonds, corporate bonds, bond funds, and how to build a fixed-income portfolio.',
    thumbnailURL: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop',
    price: 64.99,
    category: 'investing',
    level: 'intermediate',
    totalEnrollments: 650,
    tags: ['Bonds', 'Fixed Income', 'Investment'],
    videos: [
      { _id: 'v1', duration: '22:10' },
      { _id: 'v2', duration: '25:30' },
      { _id: 'v3', duration: '23:45' },
      { _id: 'v4', duration: '24:20' },
      { _id: 'v5', duration: '21:15' },
      { _id: 'v6', duration: '26:40' }
    ]
  },
  {
    _id: 'sample-course-9',
    title: 'Day Trading Fundamentals',
    description: 'Learn day trading strategies and techniques. Master chart patterns, technical indicators, entry and exit points, and how to manage risk in fast-paced trading environments.',
    thumbnailURL: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop',
    price: 84.99,
    category: 'trading',
    level: 'advanced',
    totalEnrollments: 1120,
    tags: ['Day Trading', 'Technical Analysis', 'Strategies'],
    videos: [
      { _id: 'v1', duration: '28:30' },
      { _id: 'v2', duration: '31:15' },
      { _id: 'v3', duration: '29:45' },
      { _id: 'v4', duration: '33:20' },
      { _id: 'v5', duration: '27:50' },
      { _id: 'v6', duration: '30:10' },
      { _id: 'v7', duration: '32:25' }
    ]
  },
  {
    _id: 'sample-course-10',
    title: 'Value Investing Principles',
    description: 'Learn the principles of value investing from legendary investors. Understand how to identify undervalued stocks, analyze company fundamentals, and build a long-term value portfolio.',
    thumbnailURL: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=600&fit=crop',
    price: 74.99,
    category: 'investing',
    level: 'intermediate',
    totalEnrollments: 890,
    tags: ['Value Investing', 'Fundamentals', 'Analysis'],
    videos: [
      { _id: 'v1', duration: '26:20' },
      { _id: 'v2', duration: '28:45' },
      { _id: 'v3', duration: '25:30' },
      { _id: 'v4', duration: '27:15' },
      { _id: 'v5', duration: '29:40' },
      { _id: 'v6', duration: '24:50' }
    ]
  },
  {
    _id: 'sample-course-11',
    title: 'Swing Trading Masterclass',
    description: 'Master swing trading strategies that capture multi-day price movements. Learn position sizing, trade management, and how to identify high-probability swing trading setups.',
    thumbnailURL: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop',
    price: 94.99,
    category: 'trading',
    level: 'intermediate',
    totalEnrollments: 1050,
    tags: ['Swing Trading', 'Strategies', 'Technical Analysis'],
    videos: [
      { _id: 'v1', duration: '30:15' },
      { _id: 'v2', duration: '28:30' },
      { _id: 'v3', duration: '32:45' },
      { _id: 'v4', duration: '29:20' },
      { _id: 'v5', duration: '31:10' },
      { _id: 'v6', duration: '27:50' }
    ]
  },
  {
    _id: 'sample-course-12',
    title: 'Risk Management in Trading',
    description: 'Essential risk management techniques for traders. Learn position sizing, stop-loss strategies, risk-reward ratios, and how to protect your capital while maximizing profits.',
    thumbnailURL: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop',
    price: 69.99,
    category: 'trading',
    level: 'intermediate',
    totalEnrollments: 1420,
    tags: ['Risk Management', 'Trading', 'Protection'],
    videos: [
      { _id: 'v1', duration: '24:30' },
      { _id: 'v2', duration: '26:15' },
      { _id: 'v3', duration: '25:45' },
      { _id: 'v4', duration: '27:20' },
      { _id: 'v5', duration: '23:50' }
    ]
  }
];

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
  
  // TEMPORARILY DISABLED: Build filters for React Query (not needed when using sample courses only)
  // const filters: CourseFilters = useMemo(() => ({
  //   page: currentPage,
  //   limit: itemsPerPage,
  //   search: searchTerm,
  //   category: selectedCategory,
  //   level: selectedLevel,
  //   tag: selectedTag,
  //   priceRange: priceRange,
  // }), [currentPage, itemsPerPage, searchTerm, selectedCategory, selectedLevel, selectedTag, priceRange]);
  
  // TEMPORARILY DISABLED: Use React Query for fetching courses
  // const { 
  //   data: coursesResponse, 
  //   isLoading: loading, 
  //   error,
  //   refetch 
  // } = useCourses(filters);
  
  // TEMPORARILY: Use only sample courses (backend fetching disabled)
  const loading = false;
  const error = null;
  const coursesResponse = null;
  const apiCourses: ApiCourse[] = [];
  const useSampleCourses = true; // Always use sample courses
  
  // Placeholder refetch function
  const refetch = useCallback(() => {
    console.log('Refetch called - using sample courses only');
  }, []);
  
  // Apply client-side filtering to sample courses
  const filteredSampleCourses = useMemo(() => {
    let filtered = [...sampleCourses];
    
    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        course =>
          course.title.toLowerCase().includes(searchLower) ||
          course.description.toLowerCase().includes(searchLower) ||
          course.tags?.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }
    
    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter(course => 
        course.category?.toLowerCase() === selectedCategory.toLowerCase()
      );
    }
    
    // Apply level filter
    if (selectedLevel) {
      filtered = filtered.filter(course => 
        course.level?.toLowerCase() === selectedLevel.toLowerCase()
      );
    }
    
    // Apply tag filter
    if (selectedTag) {
      filtered = filtered.filter(course => 
        course.tags?.some(tag => tag.toLowerCase() === selectedTag.toLowerCase())
      );
    }
    
    // Apply price range filter
    if (priceRange) {
      filtered = filtered.filter(course => {
        switch (priceRange) {
          case 'free':
            return course.price === 0;
          case 'under-50':
            return course.price > 0 && course.price < 50;
          case '50-100':
            return course.price >= 50 && course.price <= 100;
          case 'over-100':
            return course.price > 100;
          default:
            return true;
        }
      });
    }
    
    return filtered;
  }, [searchTerm, selectedCategory, selectedLevel, selectedTag, priceRange]);
  
  // Paginate filtered sample courses
  const paginatedSampleCourses = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredSampleCourses.slice(start, end);
  }, [filteredSampleCourses, currentPage, itemsPerPage]);
  
  // Calculate pagination for sample courses
  const sampleTotalPages = useMemo(() => {
    return Math.ceil(filteredSampleCourses.length / itemsPerPage);
  }, [filteredSampleCourses.length, itemsPerPage]);
  
  // TEMPORARILY: Always use sample courses (backend disabled)
  const useFallback = true; // Always true since we're using sample courses only
  const courses = paginatedSampleCourses;
  const totalPages = sampleTotalPages;
  const totalItems = filteredSampleCourses.length;

  // Use courses directly since filtering is now handled server-side (or client-side for samples)
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
    const maxPages = Math.ceil(filteredSampleCourses.length / itemsPerPage);
    if (page >= 1 && page <= maxPages) {
      handlePageChange(page);
    } else {
      setGoToPageInput(''); // Clear invalid input
    }
  }, [goToPageInput, filteredSampleCourses.length, itemsPerPage, handlePageChange]);

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
    
    // Get categories from sample courses and map them to new values
    const existingCategories = [...new Set(sampleCourses.map(course => {
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
  }, []); // No dependencies since we're using static sample courses

  const levels = useMemo(() => {
    const allCourses = sampleCourses; // Always use sample courses
    const uniqueLevels = [
      ...new Set(
        allCourses
          .map(course => course.level)
          .filter((level): level is string => typeof level === 'string' && level.length > 0)
      )
    ];
    return uniqueLevels.sort();
  }, [courses, useSampleCourses]);

  const tags = useMemo(() => {
    const allCourses = sampleCourses; // Always use sample courses
    const allTags = allCourses.flatMap(course => course.tags || []);
    const uniqueTags = [...new Set(allTags)];
    return uniqueTags.sort();
  }, [courses, useSampleCourses]);

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-6 h-64 sm:h-72 border border-gray-700" />
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
        <div className="text-center text-gray-400 py-12 sm:py-16 md:py-20 text-sm sm:text-base">
          {totalItems === 0 ? t('courses.no_courses_available') : t('courses.no_courses_match')}
        </div>
      );
    }
    
    // Rendering course grid
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
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
          />
        );})}
      </div>
    );
  }, [displayedCourses, loading, error, totalItems, handlePurchaseSuccess, handleRefetch, t, useFallback]);

  return (
    <div className="min-h-screen bg-gray-900 text-white pt-16 sm:pt-20 md:pt-24 pb-6 sm:pb-8 md:pb-12">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="text-center mb-6 sm:mb-8 md:mb-12">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2 sm:mb-3 md:mb-4 pb-2 sm:pb-3 md:pb-4">
            {t('courses.page_title_all')}
          </h1>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-300">
            {t('courses.page_subtitle')}
          </p>
        </div>

        {/* New Search and Filter Section - Compact Horizontal Layout */}
        <div className="mb-6 sm:mb-8 md:mb-12">
          {/* Unified Search and Filter Bar */}
          <div className="bg-gradient-to-br from-gray-800 via-gray-800/95 to-gray-900 rounded-3xl shadow-2xl border border-gray-700/30 overflow-hidden backdrop-blur-xl">
            {/* Top Row: Search and Quick Actions */}
            <div className="p-4 sm:p-5 md:p-6 border-b border-gray-700/50">
              <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
                {/* Search Input - Takes full width on mobile, flex on desktop */}
                <div className="flex-1 w-full lg:w-auto min-w-0">
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative flex items-center bg-gray-900/60 border-2 border-gray-700/40 rounded-2xl px-4 py-3 focus-within:border-cyan-500/60 focus-within:bg-gray-900/80 transition-all duration-300">
                      <Search className="h-5 w-5 text-cyan-400/70 mr-3 flex-shrink-0" />
                      <input
                        type="text"
                        placeholder={t('courses.search_placeholder')}
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none text-sm sm:text-base"
                      />
                      {searchTerm && (
                        <button
                          onClick={() => handleSearchChange('')}
                          className="ml-2 p-1 text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all duration-200"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Filter Pills - Horizontal Scrollable */}
                <div className="flex items-center gap-2 lg:gap-3 flex-wrap lg:flex-nowrap lg:ml-4">
                  {/* Category Quick Filters */}
                  <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 lg:pb-0">
                    <button
                      onClick={() => handleCategoryChange('')}
                      className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                        !selectedCategory
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/30'
                          : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700 hover:text-white border border-gray-600/50'
                      }`}
                    >
                      {t('courses.filter_all')}
                    </button>
                    {categories.slice(0, 4).map(category => (
                      <button
                        key={category}
                        onClick={() => handleCategoryChange(category)}
                        className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                          selectedCategory === category
                            ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/30'
                            : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700 hover:text-white border border-gray-600/50'
                        }`}
                      >
                        {t(`categories.${category}`)}
                      </button>
                    ))}
                  </div>

                  {/* Filter Toggle Button */}
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${
                      showFilters
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/40'
                        : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700 hover:text-white border border-gray-600/50'
                    }`}
                  >
                    <Filter className="h-4 w-4" />
                    <span>{showFilters ? t('common.close') : t('common.filter')}</span>
                  </button>

                  {/* Clear Filters Button */}
                  {(searchTerm || selectedCategory || selectedLevel || selectedTag || priceRange) && (
                    <button
                      onClick={clearFilters}
                      className="px-3 py-2 rounded-xl text-xs sm:text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-700/50 border border-gray-600/50 rounded-xl transition-all duration-200 flex items-center gap-1.5"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>{t('common.reset')}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Expandable Filter Panel */}
            {showFilters && (
              <div className="p-4 sm:p-5 md:p-6 bg-gradient-to-b from-gray-800/30 to-gray-900/50 border-t border-gray-700/30">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Category Filter */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                      <div className="w-1 h-4 bg-gradient-to-b from-cyan-400 to-blue-400 rounded-full"></div>
                      {t('courses.filter_category')}
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className="w-full px-3 py-2.5 bg-gray-900/80 border border-gray-700/50 rounded-xl text-white text-sm focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all duration-200 appearance-none"
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
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                      <div className="w-1 h-4 bg-gradient-to-b from-blue-400 to-purple-400 rounded-full"></div>
                      {t('courses.filter_skill_level')}
                    </label>
                    <select
                      value={selectedLevel}
                      onChange={(e) => handleLevelChange(e.target.value)}
                      className="w-full px-3 py-2.5 bg-gray-900/80 border border-gray-700/50 rounded-xl text-white text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 appearance-none"
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
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                      <div className="w-1 h-4 bg-gradient-to-b from-purple-400 to-pink-400 rounded-full"></div>
                      {t('courses.filter_tags')}
                    </label>
                    <select
                      value={selectedTag}
                      onChange={(e) => handleTagChange(e.target.value)}
                      className="w-full px-3 py-2.5 bg-gray-900/80 border border-gray-700/50 rounded-xl text-white text-sm focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all duration-200 appearance-none"
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
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                      <div className="w-1 h-4 bg-gradient-to-b from-pink-400 to-cyan-400 rounded-full"></div>
                      {t('courses.filter_price_range')}
                    </label>
                    <select
                      value={priceRange}
                      onChange={(e) => handlePriceRangeChange(e.target.value)}
                      className="w-full px-3 py-2.5 bg-gray-900/80 border border-gray-700/50 rounded-xl text-white text-sm focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500 transition-all duration-200 appearance-none"
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
              <div className="px-4 sm:px-5 md:px-6 py-3 bg-gray-900/40 border-t border-gray-700/30">
                <div className="flex items-center flex-wrap gap-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide mr-1">{t('courses.filtered_by')}:</span>
                  {searchTerm && (
                    <span className="inline-flex items-center px-2.5 py-1 bg-cyan-500/20 text-cyan-300 rounded-lg text-xs font-medium border border-cyan-500/30">
                      <Search className="h-3 w-3 mr-1" />
                      "{searchTerm}"
                    </span>
                  )}
                  {selectedCategory && (
                    <span className="inline-flex items-center px-2.5 py-1 bg-blue-500/20 text-blue-300 rounded-lg text-xs font-medium border border-blue-500/30">
                      {t(`categories.${selectedCategory}`)}
                    </span>
                  )}
                  {selectedLevel && (
                    <span className="inline-flex items-center px-2.5 py-1 bg-green-500/20 text-green-300 rounded-lg text-xs font-medium border border-green-500/30">
                      {selectedLevel === 'beginner' ? t('courses.filter_beginner') :
                       selectedLevel === 'intermediate' ? t('courses.filter_intermediate') :
                       selectedLevel === 'advanced' ? t('courses.filter_advanced') :
                       selectedLevel.charAt(0).toUpperCase() + selectedLevel.slice(1)}
                    </span>
                  )}
                  {selectedTag && (
                    <span className="inline-flex items-center px-2.5 py-1 bg-orange-500/20 text-orange-300 rounded-lg text-xs font-medium border border-orange-500/30">
                      #{selectedTag}
                    </span>
                  )}
                  {priceRange && (
                    <span className="inline-flex items-center px-2.5 py-1 bg-purple-500/20 text-purple-300 rounded-lg text-xs font-medium border border-purple-500/30">
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
          <div className="mt-4 sm:mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 bg-gray-800/40 rounded-lg border border-gray-700/30">
                <span className="text-xs sm:text-sm text-gray-400">
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin h-3 w-3 border-2 border-cyan-400 border-t-transparent rounded-full"></span>
                      {t('common.loading')}
                    </span>
                  ) : (
                    <>
                      <span className="text-cyan-400 font-bold">{displayedCourses.length}</span>
                      <span className="text-gray-500 mx-1">/</span>
                      <span className="text-white font-semibold">{totalItems}</span>
                      <span className="text-gray-500 ml-1">{t('navbar.courses').toLowerCase()}</span>
                    </>
                  )}
                </span>
              </div>
              {useFallback && !loading && (
                <span className="px-2.5 py-1 text-xs font-medium text-cyan-300 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                  {t('courses.sample_data_notice', 'Sample Courses')}
                </span>
              )}
            </div>
          </div>
        </div>

        {content}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-8 sm:mt-10 md:mt-12 flex flex-col space-y-4 sm:space-y-6">
            {/* Items per page selector and pagination info */}
            <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
              {/* Items per page selector */}
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-300">{t('courses.pagination.show')}:</label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
                  className="px-3 py-1.5 bg-gray-800 text-white border border-gray-700 rounded-md text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                >
                  <option value={6}>{t('courses.pagination.per_page', { count: 6 })}</option>
                  <option value={12}>{t('courses.pagination.per_page', { count: 12 })}</option>
                  <option value={24}>{t('courses.pagination.per_page', { count: 24 })}</option>
                  <option value={48}>{t('courses.pagination.per_page', { count: 48 })}</option>
                </select>
              </div>

              {/* Pagination info */}
              <div className="text-sm text-gray-300">
                {t('courses.pagination.page_info', { current: currentPage, total: totalPages, items: totalItems })}
              </div>
            </div>

            {/* Pagination buttons */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              {/* Previous button */}
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 sm:px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-700 rounded-md hover:bg-gray-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('courses.pagination.previous')}
              </button>

              {/* Page numbers */}
              <div className="flex items-center flex-wrap gap-1 sm:gap-2">
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
                        className="px-3 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-700 rounded-md hover:bg-gray-700 hover:text-white transition-colors"
                      >
                        1
                      </button>
                    );
                    if (startPage > 2) {
                      pages.push(
                        <span key="ellipsis1" className="px-2 text-gray-500">
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
                        className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                          i === currentPage
                            ? 'text-white bg-cyan-500 border border-cyan-500'
                            : 'text-gray-300 bg-gray-800 border border-gray-700 hover:bg-gray-700 hover:text-white'
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
                        <span key="ellipsis2" className="px-2 text-gray-500">
                          ...
                        </span>
                      );
                    }
                    pages.push(
                      <button
                        key={totalPages}
                        onClick={() => handlePageChange(totalPages)}
                        className="px-3 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-700 rounded-md hover:bg-gray-700 hover:text-white transition-colors"
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
                className="px-3 sm:px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-700 rounded-md hover:bg-gray-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('courses.pagination.next')}
              </button>
            </div>

            {/* Go to page input (only show if more than 1 page) */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center space-x-2 pt-2 border-t border-gray-800">
                <label className="text-sm text-gray-300">{t('courses.pagination.go_to_page', 'Go to page')}:</label>
                <input
                  type="number"
                  min="1"
                  max={totalPages}
                  value={goToPageInput}
                  onChange={(e) => setGoToPageInput(e.target.value)}
                  onKeyPress={handleGoToPageKeyPress}
                  placeholder={currentPage.toString()}
                  className="w-20 px-3 py-1.5 bg-gray-800 text-white border border-gray-700 rounded-md text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-center"
                />
                <button
                  onClick={handleGoToPage}
                  disabled={!goToPageInput || parseInt(goToPageInput) < 1 || parseInt(goToPageInput) > totalPages || isNaN(parseInt(goToPageInput))}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-cyan-600 border border-cyan-500 rounded-md hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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