/**
 * Mock Bundle Data
 * 
 * This file contains mock/static data for course bundles.
 * This is a frontend-only implementation - backend integration will come later.
 * 
 * Bundle structure:
 * - id: Unique identifier for the bundle
 * - title: Bundle name
 * - description: Short description of the bundle
 * - longDescription: Detailed description for the detail page
 * - price: Bundle price (in USD)
 * - originalValue: Total value if courses were purchased individually (optional)
 * - courseIds: Array of course IDs that are included in this bundle
 * - thumbnailURL: Optional thumbnail image URL
 * - category: Optional category tag
 * - featured: Whether this bundle should be featured/promoted
 */

export interface Bundle {
  id: string;
  title: string;
  description: string;
  longDescription: string;
  price: number;
  originalValue?: number;
  courseIds: string[];
  thumbnailURL?: string;
  category?: string;
  featured?: boolean;
}

// Mock bundle data
// Note: courseIds reference courses by their _id from the backend
// For now, we use placeholder IDs that should match existing courses
export const mockBundles: Bundle[] = [
  {
    id: 'bundle-1',
    title: 'Complete Trading Mastery Bundle',
    description: 'Master professional trading strategies with this comprehensive bundle covering everything from basics to advanced techniques.',
    longDescription: 'This comprehensive bundle includes all the essential courses you need to become a professional trader. Learn fundamental analysis, technical analysis, risk management, and advanced trading strategies. Perfect for both beginners and experienced traders looking to enhance their skills.',
    price: 199.99,
    originalValue: 349.97,
    courseIds: [
      'sample-course-1', // Introduction to Stock Market Investing
      'sample-course-2', // Advanced Trading Strategies
      'sample-course-3'  // Portfolio Management (if exists)
    ],
    thumbnailURL: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=600&fit=crop',
    category: 'Trading',
    featured: true
  },
  {
    id: 'bundle-2',
    title: 'Investment Fundamentals Bundle',
    description: 'Build a solid foundation in investing with courses covering stocks, bonds, and portfolio management.',
    longDescription: 'Perfect for beginners, this bundle covers all the fundamentals of investing. Learn how to analyze stocks, understand market dynamics, build diversified portfolios, and make informed investment decisions. Start your investment journey with confidence.',
    price: 149.99,
    originalValue: 249.98,
    courseIds: [
      'sample-course-1', // Introduction to Stock Market Investing
      'sample-course-3'  // Portfolio Management
    ],
    thumbnailURL: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop',
    category: 'Investing',
    featured: true
  },
  {
    id: 'bundle-3',
    title: 'Advanced Strategies Bundle',
    description: 'Take your trading to the next level with advanced strategies, risk management, and professional techniques.',
    longDescription: 'Designed for experienced traders, this bundle focuses on advanced trading strategies, sophisticated risk management techniques, and professional trading systems. Learn from industry experts and master the techniques used by professional traders.',
    price: 249.99,
    originalValue: 399.97,
    courseIds: [
      'sample-course-2', // Advanced Trading Strategies
      'sample-course-1', // Introduction to Stock Market Investing
      'sample-course-3'  // Portfolio Management
    ],
    thumbnailURL: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop',
    category: 'Advanced',
    featured: false
  },
  {
    id: 'bundle-4',
    title: 'Beginner\'s Complete Guide',
    description: 'Everything you need to get started with trading and investing, from the ground up.',
    longDescription: 'New to trading and investing? This bundle is perfect for you. Start with the basics and gradually build your knowledge. Learn at your own pace with comprehensive courses designed specifically for beginners.',
    price: 99.99,
    originalValue: 149.98,
    courseIds: [
      'sample-course-1' // Introduction to Stock Market Investing
    ],
    thumbnailURL: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=800&h=600&fit=crop',
    category: 'Beginner',
    featured: true
  }
];

/**
 * Get a bundle by ID
 */
export const getBundleById = (id: string): Bundle | undefined => {
  return mockBundles.find(bundle => bundle.id === id);
};

/**
 * Get all bundles
 */
export const getAllBundles = (): Bundle[] => {
  return mockBundles;
};

/**
 * Get featured bundles
 */
export const getFeaturedBundles = (): Bundle[] => {
  return mockBundles.filter(bundle => bundle.featured);
};





