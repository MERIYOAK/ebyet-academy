/**
 * Formats duration in seconds to a user-friendly format
 * - Less than 1 hour: MM:SS (e.g., "5:30", "59:45")
 * - 1 hour or more: HH:MM:SS (e.g., "1:20:30", "2:15:45")
 */
export const formatDuration = (seconds: number | string | undefined): string => {
  if (!seconds) return '0:00';
  
  let totalSeconds = 0;
  
  // Handle different input types
  if (typeof seconds === 'number') {
    totalSeconds = Math.floor(seconds);
  } else if (typeof seconds === 'string') {
    const value = seconds.trim();
    
    // If it's already in HH:MM:SS or MM:SS format, parse it
    if (value.includes(':')) {
      const parts = value.split(':').map(p => parseInt(p, 10) || 0);
      if (parts.length === 3) {
        // HH:MM:SS format
        totalSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
      } else if (parts.length === 2) {
        // MM:SS format
        totalSeconds = parts[0] * 60 + parts[1];
      } else if (parts.length === 1) {
        // Just seconds
        totalSeconds = parts[0];
      }
    } else {
      // Try to parse as number
      const numeric = parseInt(value, 10);
      if (!isNaN(numeric)) {
        totalSeconds = numeric;
      }
    }
  }
  
  // Format the duration
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  
  if (hours > 0) {
    // Format as HH:MM:SS
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    // Format as MM:SS
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
};

/**
 * Parses duration string to seconds
 * Supports formats: "5:30", "1:20:30", "90" (seconds)
 */
export const parseDurationToSeconds = (duration: string | number | undefined): number => {
  if (!duration) return 0;
  
  // Handle number input
  if (typeof duration === 'number') {
    return Math.floor(duration);
  }
  
  // Handle string input
  if (typeof duration !== 'string') {
    return 0;
  }
  
  const value = duration.trim();
  
  if (value.includes(':')) {
    const parts = value.split(':').map(p => parseInt(p, 10) || 0);
    if (parts.length === 3) {
      // HH:MM:SS format
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      // MM:SS format
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 1) {
      // Just seconds
      return parts[0];
    }
  }
  
  // Try to parse as number (seconds)
  const numeric = parseInt(value, 10);
  return isNaN(numeric) ? 0 : numeric;
};
