/**
 * Password Validation Utility
 * Validates password strength requirements:
 * - Minimum 8 characters
 * - At least one letter (a-z, A-Z)
 * - At least one number (0-9)
 * - At least one symbol (!@#$%^&*()_+-=[]{}|;:,.<>?)
 */

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
}

export const validatePassword = (password: string): PasswordValidationResult => {
  const errors: string[] = [];
  
  // Check minimum length
  if (password.length < 8) {
    errors.push('password_requirements.min_length');
  }
  
  // Check for at least one letter
  if (!/[a-zA-Z]/.test(password)) {
    errors.push('password_requirements.requires_letter');
  }
  
  // Check for at least one number
  if (!/[0-9]/.test(password)) {
    errors.push('password_requirements.requires_number');
  }
  
  // Check for at least one symbol
  if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
    errors.push('password_requirements.requires_symbol');
  }
  
  // Determine strength
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  if (errors.length === 0) {
    if (password.length >= 12 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password) && /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
      strength = 'strong';
    } else {
      strength = 'medium';
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    strength
  };
};

export const getPasswordRequirementsText = (): string[] => {
  return [
    'password_requirements.min_length',
    'password_requirements.requires_letter',
    'password_requirements.requires_number',
    'password_requirements.requires_symbol'
  ];
};


