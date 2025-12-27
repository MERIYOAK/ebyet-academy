import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import BundleCard from '../components/BundleCard';
import LoadingMessage from '../components/LoadingMessage';
import { Search, Filter, X } from 'lucide-react';
import { useBundles, useFeaturedBundles, BundleFilters, ApiBundle } from '../hooks/useBundles';

const BundlesPage: React.FC = () => {
  const { t } = useTranslation();
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [showFeaturedOnly, setShowFeaturedOnly] = useState<boolean>(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [goToPageInput, setGoToPageInput] = useState<string>('');

  // Build filters for API
  const filters: BundleFilters = useMemo(() => ({
    page: currentPage,
    limit: itemsPerPage,
    search: searchTerm,
    category: selectedCategory,
    featured: showFeaturedOnly || undefined,
  }), [currentPage, itemsPerPage, searchTerm, selectedCategory, showFeaturedOnly]);

  // Fetch bundles from API
  const { 
    data: bundlesResponse, 
    isLoading: loading, 
    error,
    refetch 
  } = useBundles(filters);

  // Extract bundles from API response
  const bundles: ApiBundle[] = useMemo(() => {
    if (bundlesResponse?.bundles) {
      return bundlesResponse.bundles;
    }
    return [];
  }, [bundlesResponse]);

  // Calculate pagination
  const totalPages = useMemo(() => {
    return bundlesResponse?.pagination?.pages || 1;
  }, [bundlesResponse?.pagination?.pages]);

  const totalItems = useMemo(() => {
    return bundlesResponse?.pagination?.total || bundles.length;
  }, [bundlesResponse?.pagination?.total, bundles.length]);

  // Get unique categories from API bundles
  const categories = useMemo(() => {
    const cats = bundles
      .map(bundle => bundle.category)
      .filter((cat): cat is string => !!cat);
    return Array.from(new Set(cats));
  }, [bundles]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page when search changes
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category === selectedCategory ? '' : category);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setShowFeaturedOnly(false);
    setCurrentPage(1);
  };

  // Handle pagination changes
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      setGoToPageInput('');
    } else {
      setGoToPageInput(''); // Clear invalid input
    }
  }, [goToPageInput, totalPages]);

  const handleGoToPageKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleGoToPage();
    }
  };

  const hasActiveFilters = searchTerm || selectedCategory || showFeaturedOnly;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800 py-12 sm:py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 pb-2 sm:pb-3 md:pb-4 text-center">
            {t('bundles_page.title', 'Course Bundles')}
          </h1>
          <p className="text-gray-300 text-center text-base sm:text-lg md:text-xl max-w-3xl mx-auto">
            {t('bundles_page.subtitle', 'Save money by purchasing curated course bundles. Get multiple courses at a discounted price.')}
          </p>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
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
                        placeholder={t('bundles_page.search_placeholder', 'Search bundles...')}
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none text-sm sm:text-base"
                      />
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm('')}
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
                      {t('bundles_page.filter_all', 'All')}
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
                        {category}
                      </button>
                    ))}
                  </div>

                  {/* Featured Toggle */}
                  <button
                    onClick={() => setShowFeaturedOnly(!showFeaturedOnly)}
                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${
                      showFeaturedOnly
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/40'
                        : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700 hover:text-white border border-gray-600/50'
                    }`}
                  >
                    {t('bundles_page.featured_only', 'Featured Only')}
                  </button>

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
                    <span>{showFilters ? t('common.close') : t('bundles_page.filters', 'Filters')}</span>
                  </button>

                  {/* Clear Filters Button */}
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="px-3 py-2 rounded-xl text-xs sm:text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-700/50 border border-gray-600/50 transition-all duration-200 flex items-center gap-1.5"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>{t('bundles_page.clear_all', 'Clear All')}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Expandable Filter Panel */}
            {showFilters && (
              <div className="p-4 sm:p-5 md:p-6 bg-gradient-to-b from-gray-800/30 to-gray-900/50 border-t border-gray-700/30">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-5 bg-gradient-to-b from-cyan-400 to-blue-400 rounded-full"></div>
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                      {t('bundles_page.filter_by_category', 'Filter by Category')}
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {categories.map(category => (
                      <button
                        key={category}
                        onClick={() => handleCategoryChange(category)}
                        className={`px-4 py-2 rounded-xl transition-all duration-200 text-sm font-semibold ${
                          selectedCategory === category
                            ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/40 border border-cyan-400/50'
                            : 'bg-gray-700/50 border border-gray-600/50 hover:bg-gray-700 hover:border-gray-500 text-gray-300 hover:text-white'
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Active Filters Display - Inline with search bar */}
            {hasActiveFilters && (
              <div className="px-4 sm:px-5 md:px-6 py-3 bg-gray-900/40 border-t border-gray-700/30">
                <div className="flex items-center flex-wrap gap-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide mr-1">{t('bundles_page.active_filters', 'Active:')}</span>
                  {searchTerm && (
                    <span className="inline-flex items-center px-2.5 py-1 bg-cyan-500/20 text-cyan-300 rounded-lg text-xs font-medium border border-cyan-500/30">
                      <Search className="h-3 w-3 mr-1" />
                      "{searchTerm}"
                    </span>
                  )}
                  {selectedCategory && (
                    <span className="inline-flex items-center px-2.5 py-1 bg-blue-500/20 text-blue-300 rounded-lg text-xs font-medium border border-blue-500/30">
                      {selectedCategory}
                    </span>
                  )}
                  {showFeaturedOnly && (
                    <span className="inline-flex items-center px-2.5 py-1 bg-purple-500/20 text-purple-300 rounded-lg text-xs font-medium border border-purple-500/30">
                      {t('bundles_page.featured', 'Featured')}
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
                  {totalItems > 0 ? (
                    <>
                      <span className="text-cyan-400 font-bold">{bundles.length}</span>
                      <span className="text-gray-500 mx-1">/</span>
                      <span className="text-white font-semibold">{totalItems}</span>
                      <span className="text-gray-500 ml-1">{t('bundles_page.bundles', 'bundles')}</span>
                    </>
                  ) : (
                    <span>{t('bundles_page.no_bundles', 'No bundles')}</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div>
            <LoadingMessage 
              message={t('bundles_page.loading_bundles', 'Loading bundles, please wait...')}
              className="mb-8"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-6 h-64 sm:h-72 border border-gray-700" />
              ))}
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="text-center py-12">
            <div className="bg-red-900/20 text-red-400 border border-red-500/30 rounded-lg p-6 max-w-md mx-auto">
              <h3 className="text-lg font-semibold mb-2">{t('bundles_page.error_loading', 'Failed to load bundles')}</h3>
              <p className="text-sm mb-4 text-gray-300">{error.message}</p>
              <button
                onClick={() => refetch()}
                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {t('common.retry', 'Try Again')}
              </button>
            </div>
          </div>
        )}

        {/* Bundles Grid */}
        {!loading && !error && bundles.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {bundles.map(bundle => (
              <BundleCard 
                key={bundle._id} 
                bundle={{
                  id: bundle._id,
                  title: bundle.title,
                  description: bundle.description,
                  longDescription: bundle.longDescription,
                  price: bundle.price,
                  originalValue: bundle.originalValue,
                  courseIds: bundle.courseIds.map(c => c._id),
                  thumbnailURL: bundle.thumbnailURL,
                  category: bundle.category,
                  featured: bundle.featured
                }} 
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && bundles.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg mb-4">
              {t('bundles_page.no_bundles_found', 'No bundles found matching your criteria.')}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-cyan-400 hover:text-cyan-300 underline"
              >
                {t('bundles_page.clear_filters', 'Clear filters')}
              </button>
            )}
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && !error && totalPages > 1 && (
          <div className="mt-8 sm:mt-10 bg-gray-800/50 rounded-xl p-4 sm:p-6 border border-gray-700/50">
            <div className="flex flex-col gap-4">
              {/* Items per page selector and pagination info */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-300">{t('courses.pagination.show', 'Show')}:</label>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
                    className="px-3 py-1.5 bg-gray-900 text-white border border-gray-700 rounded-md text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  >
                    <option value={6}>{t('courses.pagination.per_page', { count: 6 })}</option>
                    <option value={12}>{t('courses.pagination.per_page', { count: 12 })}</option>
                    <option value={24}>{t('courses.pagination.per_page', { count: 24 })}</option>
                    <option value={48}>{t('courses.pagination.per_page', { count: 48 })}</option>
                  </select>
                </div>
                {/* Pagination info */}
                <div className="text-sm text-gray-400">
                  {t('courses.pagination.page_info', { current: currentPage, total: totalPages, items: totalItems })}
                </div>
              </div>

              {/* Pagination buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-2">
                {/* Previous button */}
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 sm:px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-700 rounded-md hover:bg-gray-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {t('courses.pagination.previous', 'Previous')}
                </button>

                {/* Page numbers */}
                <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-center">
                  {(() => {
                    const pages: React.ReactNode[] = [];
                    const maxVisiblePages = 5;
                    const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

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
                              ? 'text-white bg-gradient-to-r from-cyan-600 to-blue-600 border border-cyan-500'
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
                  {t('courses.pagination.next', 'Next')}
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
                    className="px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-cyan-600 to-blue-600 border border-cyan-500 rounded-md hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {t('courses.pagination.go', 'Go')}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BundlesPage;





