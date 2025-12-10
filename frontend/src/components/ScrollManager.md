# ScrollManager Component

## Overview
The `ScrollManager` component provides a global scroll behavior system for the entire React application, handling both user-facing and admin dashboard routes.

## Features

### 🎯 First-Time Visits
- **Automatic scroll to top**: When a user visits a page for the first time, the page automatically scrolls to the top
- **Smooth animation**: Uses `behavior: 'smooth'` for a pleasant user experience
- **Route tracking**: Tracks each unique route (including search parameters) separately

### 🔄 Navigation & Scroll Restoration
- **Position memory**: Remembers the exact scroll position for each route
- **Instant restoration**: When returning to a previously visited page, restores the exact scroll position
- **No jarring animations**: Uses `behavior: 'instant'` for restoration to avoid visual jumps

### 💾 Persistence
- **Session storage**: Scroll positions persist across page refreshes using `sessionStorage`
- **Memory efficiency**: Uses `Map` objects for fast lookups and minimal memory usage
- **Error handling**: Gracefully handles storage errors without breaking functionality

### 🌐 Global Coverage
- **All routes**: Works across all user-facing and admin dashboard routes
- **Layout independence**: Functions regardless of which layout wraps the content
- **No conflicts**: Designed to work alongside existing UI components and animations

## Implementation Details

### Route Identification
- Uses `location.pathname + location.search` to create unique route identifiers
- Handles both path changes and search parameter changes
- Example: `/courses?category=programming` is treated as a different route from `/courses`

### Scroll Position Tracking
- **Saving**: Captures scroll position when leaving a route (cleanup function)
- **Loading**: Restores position when returning to a route
- **Timing**: Uses `requestAnimationFrame` to ensure DOM is ready before scrolling

### Event Handling
- **Before unload**: Saves current position when user refreshes or closes tab
- **Visibility change**: Saves position when tab becomes hidden
- **Route change**: Automatically triggers save/restore logic

## Usage

The `ScrollManager` is automatically integrated into the app via `App.tsx`:

```tsx
<Router>
  <ScrollManager>
    <Routes>
      {/* All routes */}
    </Routes>
  </ScrollManager>
</Router>
```

## Browser Console Logging

For debugging purposes, the component logs its actions to the console:

- `🔄 [ScrollManager] First visit to /path - scrolling to top`
- `🔄 [ScrollManager] Returning to /path - restoring scroll position to 500px`
- `💾 [ScrollManager] Saving scroll position for /path: 500px`

## Technical Notes

- **Performance**: Uses `useRef` to avoid unnecessary re-renders
- **Memory**: Efficiently manages scroll position storage with Map objects
- **Compatibility**: Works with all modern browsers that support `scrollTo` with behavior options
- **Fallback**: Gracefully degrades if sessionStorage is unavailable

## Integration with Existing Components

- **ScrollToTop button**: Still available in layouts for manual scroll-to-top functionality
- **Navbar**: No conflicts with fixed/sticky navigation
- **Animations**: Compatible with existing page transitions and animations
- **Video players**: Works alongside video player scroll management
