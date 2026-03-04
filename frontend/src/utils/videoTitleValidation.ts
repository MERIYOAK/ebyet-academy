/**
 * Video title validation utilities for lesson naming convention
 */

// Regex pattern for lesson naming: "Lesson X - Video Title"
export const LESSON_TITLE_REGEX = /Lesson\s*\d+\s*-\s*.+/i;

/**
 * Validates if a video title follows the lesson naming convention
 * @param title - The video title to validate
 * @returns true if the title matches the pattern, false otherwise
 */
export const validateLessonTitle = (title: string): boolean => {
  if (!title || typeof title !== 'string') {
    return false;
  }
  return LESSON_TITLE_REGEX.test(title.trim());
};

/**
 * Gets validation error message for invalid lesson titles
 * @returns error message string
 */
export const getLessonTitleValidationError = (): string => {
  return 'Video title must follow the format: "Lesson X - Video Title" (Example: "Lesson 1 - Introduction")';
};

/**
 * Gets helper text for the lesson naming convention
 * @returns helper text string
 */
export const getLessonTitleHelperText = (): string => {
  return 'Use this format: Lesson X - Video Title (Example: Lesson 1 - Introduction)';
};

/**
 * Validates both English and Tigrinya titles for lesson naming convention
 * @param titleEn - English title
 * @param titleTg - Tigrinya title
 * @returns validation result with errors for each language
 */
export const validateBilingualLessonTitles = (titleEn: string, titleTg: string) => {
  const errors: {
    en?: string;
    tg?: string;
  } = {};

  if (!validateLessonTitle(titleEn)) {
    errors.en = getLessonTitleValidationError();
  }

  if (!validateLessonTitle(titleTg)) {
    errors.tg = getLessonTitleValidationError();
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};
