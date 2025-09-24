import DOMPurify from "dompurify";

// Input sanitization functions
export const sanitizeInput = {
  // Remove HTML tags and dangerous characters
  text: (input: string): string => {
    if (!input) return "";
    return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] }).trim();
  },

  // Sanitize HTML content (for rich text)
  html: (input: string): string => {
    if (!input) return "";
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ["p", "br", "strong", "em", "u"],
      ALLOWED_ATTR: [],
    });
  },

  // Sanitize email
  email: (input: string): string => {
    if (!input) return "";
    return input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9@._-]/g, "");
  },

  // Sanitize phone number
  phone: (input: string): string => {
    if (!input) return "";
    return input.replace(/[^0-9+\-\s()]/g, "").trim();
  },

  // Sanitize URL
  url: (input: string): string => {
    if (!input) return "";
    try {
      const url = new URL(input);
      // Only allow http and https protocols
      if (!["http:", "https:"].includes(url.protocol)) {
        return "";
      }
      return url.toString();
    } catch {
      return "";
    }
  },
};

// Validation rules
export const validationRules = {
  email: {
    required: true,
    pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    maxLength: 254,
    minLength: 5,
  },
  password: {
    required: true,
    minLength: 8,
    maxLength: 128,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
  },
  name: {
    required: true,
    minLength: 2,
    maxLength: 100,
    pattern: /^[a-zA-Z\s'-]+$/,
  },
  phone: {
    required: false,
    pattern: /^[+]?[1-9]?[0-9]{7,15}$/,
    maxLength: 20,
  },
  comment: {
    required: true,
    minLength: 10,
    maxLength: 2000,
  },
  companyName: {
    required: true,
    minLength: 2,
    maxLength: 100,
    pattern: /^[a-zA-Z0-9\s&.,'-]+$/,
  },
};

// Comprehensive validation function
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  sanitizedData: Record<string, any>;
}

export const validateAndSanitize = (
  data: Record<string, any>,
  rules: Record<string, any>
): ValidationResult => {
  const errors: Record<string, string> = {};
  const sanitizedData: Record<string, any> = {};

  for (const [field, value] of Object.entries(data)) {
    const rule = rules[field];
    if (!rule) continue;

    let sanitizedValue = value;

    // Sanitize based on field type
    if (field.includes("email")) {
      sanitizedValue = sanitizeInput.email(value);
    } else if (field.includes("phone")) {
      sanitizedValue = sanitizeInput.phone(value);
    } else if (field.includes("url") || field.includes("website")) {
      sanitizedValue = sanitizeInput.url(value);
    } else if (field.includes("comment") || field.includes("description")) {
      sanitizedValue = sanitizeInput.html(value);
    } else {
      sanitizedValue = sanitizeInput.text(value);
    }

    sanitizedData[field] = sanitizedValue;

    // Required validation
    if (rule.required && (!sanitizedValue || sanitizedValue.trim() === "")) {
      errors[field] = `${field} is required`;
      continue;
    }

    // Skip other validations if field is empty and not required
    if (!sanitizedValue && !rule.required) continue;

    // Length validations
    if (rule.minLength && sanitizedValue.length < rule.minLength) {
      errors[field] = `${field} must be at least ${rule.minLength} characters`;
    }

    if (rule.maxLength && sanitizedValue.length > rule.maxLength) {
      errors[field] = `${field} must not exceed ${rule.maxLength} characters`;
    }

    // Pattern validation
    if (rule.pattern && !rule.pattern.test(sanitizedValue)) {
      errors[field] = getPatternErrorMessage(field);
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitizedData,
  };
};

const getPatternErrorMessage = (field: string): string => {
  switch (field) {
    case "email":
      return "Please enter a valid email address";
    case "password":
      return "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character";
    case "name":
      return "Name can only contain letters, spaces, hyphens, and apostrophes";
    case "phone":
      return "Please enter a valid phone number";
    case "companyName":
      return "Company name contains invalid characters";
    default:
      return `${field} format is invalid`;
  }
};

// Rate limiting helper
export const createRateLimiter = (maxAttempts: number, windowMs: number) => {
  const attempts = new Map<string, { count: number; resetTime: number }>();

  return (identifier: string): boolean => {
    const now = Date.now();
    const userAttempts = attempts.get(identifier);

    if (!userAttempts || now > userAttempts.resetTime) {
      attempts.set(identifier, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (userAttempts.count >= maxAttempts) {
      return false;
    }

    userAttempts.count++;
    return true;
  };
};
