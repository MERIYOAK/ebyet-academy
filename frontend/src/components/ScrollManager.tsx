import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

interface ScrollManagerProps {
  children: React.ReactNode;
}

const ScrollManager: React.FC<ScrollManagerProps> = ({ children }) => {
  const location = useLocation();
  const scrollPositions = useRef<Map<string, number>>(new Map());
  const previousPath = useRef<string>('');
  const navigationHistory = useRef<string[]>([]);
  const isNavigatingBack = useRef<boolean>(false);

  useEffect(() => {
    const currentPath = location.pathname + location.search;
    
    // Check if we're navigating back by seeing if current path is in history before previous path
    const currentIndex = navigationHistory.current.indexOf(currentPath);
    const previousIndex = navigationHistory.current.indexOf(previousPath.current);
    const isBackNavigation = currentIndex !== -1 && previousIndex !== -1 && currentIndex < previousIndex;

    // Handle scroll behavior based on navigation type
    if (isBackNavigation || isNavigatingBack.current) {
      // Back navigation - restore saved scroll position
      isNavigatingBack.current = false;
      const savedPosition = scrollPositions.current.get(currentPath);
      
      if (savedPosition !== undefined && savedPosition > 0) {
        // Wait for DOM to be ready, then restore position smoothly
        requestAnimationFrame(() => {
          setTimeout(() => {
            window.scrollTo({
              top: savedPosition,
              left: 0,
              behavior: 'smooth'
            });
          }, 100);
        });
      } else {
        // No saved position, scroll to top smoothly
        requestAnimationFrame(() => {
          setTimeout(() => {
            window.scrollTo({
              top: 0,
              left: 0,
              behavior: 'smooth'
            });
          }, 100);
        });
      }
    } else {
      // Forward navigation (new page) - scroll to top smoothly
      requestAnimationFrame(() => {
        setTimeout(() => {
          window.scrollTo({
            top: 0,
            left: 0,
            behavior: 'smooth'
          });
        }, 100);
      });
      
      // Add to navigation history if it's a new page
      if (!navigationHistory.current.includes(currentPath)) {
        navigationHistory.current.push(currentPath);
        // Keep only last 50 entries to prevent memory issues
        if (navigationHistory.current.length > 50) {
          navigationHistory.current.shift();
        }
      }
    }

    // Cleanup: Save scroll position of current page when navigating away
    return () => {
      if (previousPath.current && previousPath.current !== currentPath) {
        const currentScrollPosition = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
        if (currentScrollPosition > 0) {
          scrollPositions.current.set(previousPath.current, currentScrollPosition);
        }
      }
      // Update previous path for next render
      previousPath.current = currentPath;
    };
  }, [location.pathname, location.search]);

  // Continuously save scroll position as user scrolls (throttled)
  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout;
    
    const handleScroll = () => {
      // Throttle scroll position saving
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const currentPath = location.pathname + location.search;
        const currentScrollPosition = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
        if (currentScrollPosition > 0) {
          scrollPositions.current.set(currentPath, currentScrollPosition);
        }
      }, 150);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
      // Save final scroll position on cleanup
      const currentPath = location.pathname + location.search;
      const currentScrollPosition = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
      if (currentScrollPosition > 0) {
        scrollPositions.current.set(currentPath, currentScrollPosition);
      }
    };
  }, [location.pathname, location.search]);

  // Save scroll position on page unload/refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      const currentPath = location.pathname + location.search;
      const currentScrollPosition = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
      scrollPositions.current.set(currentPath, currentScrollPosition);
      
      // Save to sessionStorage for persistence
      try {
        const scrollData = JSON.stringify(Array.from(scrollPositions.current.entries()));
        sessionStorage.setItem('scrollPositions', scrollData);
      } catch (error) {
        console.warn('Failed to save scroll positions to sessionStorage:', error);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        const currentPath = location.pathname + location.search;
        const currentScrollPosition = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
        scrollPositions.current.set(currentPath, currentScrollPosition);
      }
    };

    // Restore scroll positions from sessionStorage on mount
    try {
      const savedScrollData = sessionStorage.getItem('scrollPositions');
      if (savedScrollData) {
        const scrollEntries = JSON.parse(savedScrollData);
        scrollPositions.current = new Map(scrollEntries);
      }
    } catch (error) {
      console.warn('Failed to restore scroll positions from sessionStorage:', error);
    }

    // Listen for popstate events (browser back/forward)
    const handlePopState = (event: PopStateEvent) => {
      isNavigatingBack.current = true;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [location.pathname, location.search]);

  return <>{children}</>;
};

export default ScrollManager;
