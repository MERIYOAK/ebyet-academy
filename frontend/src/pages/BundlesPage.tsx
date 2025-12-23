import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import BundleCard from '../components/BundleCard';
import LoadingMessage from '../components/LoadingMessage';
import { Search, Filter, X } from 'lucide-react';
import { getAllBundles, getFeaturedBundles, Bundle } from '../data/mockBundles';

const BundlesPage: React.FC = () => {
  const { t } = useTranslation();
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [showFeaturedOnly, setShowFeaturedOnly] = useState<boolean>(false);

  // Get all bundles (mock data)
  const allBundles = getAllBundles();
  const featuredBundles = getFeaturedBundles();

  // Get unique categories from bundles
  const categories = useMemo(() => {
    const cats = allBundles
      .map(bundle => bundle.category)
      .filter((cat): cat is string => !!cat);
    return Array.from(new Set(cats));
  }, [allBundles]);

  // Filter bundles based on search and filters
  const filteredBundles = useMemo(() => {
    let bundles = showFeaturedOnly ? featuredBundles : allBundles;

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      bundles = bundles.filter(
        bundle =>
          bundle.title.toLowerCase().includes(searchLower) ||
          bundle.description.toLowerCase().includes(searchLower)
      );
    }

    // Apply category filter
    if (selectedCategory) {
      bundles = bundles.filter(bundle => bundle.category === selectedCategory);
    }

    return bundles;
  }, [allBundles, featuredBundles, searchTerm, selectedCategory, showFeaturedOnly]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category === selectedCategory ? '' : category);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setShowFeaturedOnly(false);
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
                  <span className="text-cyan-400 font-bold">{filteredBundles.length}</span>
                  <span className="text-gray-500 mx-1">/</span>
                  <span className="text-white font-semibold">{allBundles.length}</span>
                  <span className="text-gray-500 ml-1">{t('bundles_page.bundles', 'bundles')}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bundles Grid */}
        {filteredBundles.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filteredBundles.map(bundle => (
              <BundleCard key={bundle.id} bundle={bundle} />
            ))}
          </div>
        ) : (
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
      </div>
    </div>
  );
};

export default BundlesPage;





