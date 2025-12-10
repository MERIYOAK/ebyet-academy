import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

interface ScrollManagerProps {
  children: React.ReactNode;
}

const ScrollManager: React.FC<ScrollManagerProps> = ({ children }) => {
  const location = useLocation();
  const scrollPositions = useRef<Map<string, number>>(new Map());
  const isFirstVisit = useRef<Map<string, boolean>>(new Map());

  useEffect(() => {
    const currentPath = location.pathname + location.search;
    
    // Check if this is the first visit to this route
    const isFirstTime = !isFirstVisit.current.has(currentPath);
    
    if (isFirstTime) {
      // First time visiting this route - scroll to top with smooth animation
      isFirstVisit.current.set(currentPath, true);
      
      console.log(`🔄 [ScrollManager] First visit to ${currentPath} - scrolling to top`);
      
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: 'smooth'
        });
      });
    } else {
      // Returning to this route - restore scroll position
      const savedPosition = scrollPositions.current.get(currentPath);
      
      if (savedPosition !== undefined) {
        console.log(`🔄 [ScrollManager] Returning to ${currentPath} - restoring scroll position to ${savedPosition}px`);
        
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
          window.scrollTo({
            top: savedPosition,
            left: 0,
            behavior: 'instant' // Use instant for restoration to avoid jarring animation
          });
        });
      } else {
        console.log(`🔄 [ScrollManager] Returning to ${currentPath} - no saved position, staying at current position`);
      }
    }

    // Save current scroll position when leaving this route
    return () => {
      const currentScrollPosition = window.scrollY;
      scrollPositions.current.set(currentPath, currentScrollPosition);
      console.log(`💾 [ScrollManager] Saving scroll position for ${currentPath}: ${currentScrollPosition}px`);
    };
  }, [location.pathname, location.search]);

  // Save scroll position on page unload/refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      const currentPath = location.pathname + location.search;
      const currentScrollPosition = window.scrollY;
      scrollPositions.current.set(currentPath, currentScrollPosition);
      
      // Also save to sessionStorage for persistence across page refreshes
      try {
        const scrollData = JSON.stringify(Array.from(scrollPositions.current.entries()));
        sessionStorage.setItem('scrollPositions', scrollData);
        
        const visitData = JSON.stringify(Array.from(isFirstVisit.current.entries()));
        sessionStorage.setItem('firstVisits', visitData);
      } catch (error) {
        console.warn('Failed to save scroll positions to sessionStorage:', error);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        const currentPath = location.pathname + location.search;
        const currentScrollPosition = window.scrollY;
        scrollPositions.current.set(currentPath, currentScrollPosition);
      }
    };

    // Restore scroll positions from sessionStorage on mount
    try {
      const savedScrollData = sessionStorage.getItem('scrollPositions');
      const savedVisitData = sessionStorage.getItem('firstVisits');
      
      if (savedScrollData) {
        const scrollEntries = JSON.parse(savedScrollData);
        scrollPositions.current = new Map(scrollEntries);
      }
      
      if (savedVisitData) {
        const visitEntries = JSON.parse(savedVisitData);
        isFirstVisit.current = new Map(visitEntries);
      }
    } catch (error) {
      console.warn('Failed to restore scroll positions from sessionStorage:', error);
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [location.pathname, location.search]);

  return <>{children}</>;
};

export default ScrollManager;
