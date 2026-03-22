/**
 * Input validation utilities for API routes
 * Uses Zod for runtime type checking and validation
 */

import { z } from 'zod';

// Password validation schema with strong requirements
export const passwordSchema = z.string()
  .min(12, 'Password must be at least 12 characters long')
  .max(100, 'Password must not exceed 100 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// Email validation schema
export const emailSchema = z.string()
  .email('Invalid email address')
  .toLowerCase()
  .trim();

// Phone validation schema (Indian format)
export const phoneSchema = z.string()
  .regex(/^[6-9]\d{9}$/, 'Invalid phone number format');

// GSTIN validation schema (Indian GST number)
export const gstinSchema = z.string()
  .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN format')
  .optional();

// User registration schema
export const userRegistrationSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: emailSchema,
  password: passwordSchema,
  invitationToken: z.string().min(10, 'Invitation token is required'),
  phone: phoneSchema.optional(),
  address: z.string().max(500).optional(),
  state: z.string().max(100).optional(),
  gstin: gstinSchema
});

// User login schema
export const userLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  role: z.enum(['Admin', 'PrimaryExecutive', 'SecondaryExecutive', 'Customer'])
});

// Product schema
export const productSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  manufacturingCost: z.number().positive(),
  totalStock: z.number().int().nonnegative(),
  hsn_code: z.string().regex(/^\d{4,8}$/, 'HSN code must be 4-8 digits'),
  gst_rate: z.number().min(0).max(100)
});

// Sale schema
export const saleSchema = z.object({
  assignment_id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid assignment ID'),
  quantity_sold: z.number().int().positive(),
  unit_price: z.number().positive(),
  discount_percentage: z.number().min(0).max(100).optional(),
  payment_method: z.enum(['Cash', 'Card', 'UPI', 'Net Banking', 'Cheque']).optional(),
  customer_id: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  customer_details: z.object({
    name: z.string().min(2).max(100),
    email: emailSchema.optional(),
    phone: phoneSchema.optional(),
    address: z.string().max(500).optional(),
    state: z.string().max(100).optional(),
    gstin: gstinSchema
  }).optional(),
  notes: z.string().max(1000).optional()
});

// Invoice schema
export const invoiceSchema = z.object({
  sale_id: z.string().regex(/^[0-9a-fA-F]{24}$/),
  due_date: z.string().datetime().optional(),
  notes: z.string().max(1000).optional(),
  terms_and_conditions: z.string().max(2000).optional()
});

// Assignment schema
export const assignmentSchema = z.object({
  productId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  salesman_id: z.string().regex(/^[0-9a-fA-F]{24}$/),
  quantity: z.number().int().positive(),
  sellingPricePerUnit: z.number().positive(),
  notes: z.string().max(500).optional()
});

// Pagination schema
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
});

// Date range schema
export const dateRangeSchema = z.object({
  from_date: z.string().datetime().optional(),
  to_date: z.string().datetime().optional()
}).refine(
  (data) => {
    if (data.from_date && data.to_date) {
      return new Date(data.from_date) <= new Date(data.to_date);
    }
    return true;
  },
  { message: 'From date must be before or equal to to date' }
);

/**
 * Sanitize string input to prevent injection attacks
 */
export function sanitizeString(input: string): string {
  // Remove null bytes
  let sanitized = input.replace(/\0/g, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  // Escape HTML entities
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  
  sanitized = sanitized.replace(/[&<>"'/]/g, (match) => htmlEntities[match]);
  
  return sanitized;
}

/**
 * Validate MongoDB ObjectId
 */
export function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

/**
 * Generic validation function for API routes
 */
export async function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): Promise<{ success: true; data: T } | { success: false; errors: string[] }> {
  try {
    const validatedData = await schema.parseAsync(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      return { success: false, errors };
    }
    return { success: false, errors: ['Validation failed'] };
  }
}

/**
 * Password strength checker
 */
export function checkPasswordStrength(password: string): {
  score: number;
  feedback: string[];
} {
  let score = 0;
  const feedback: string[] = [];

  // Length check
  if (password.length >= 12) score += 20;
  if (password.length >= 16) score += 10;
  
  // Character variety checks
  if (/[a-z]/.test(password)) score += 15;
  if (/[A-Z]/.test(password)) score += 15;
  if (/[0-9]/.test(password)) score += 15;
  if (/[^A-Za-z0-9]/.test(password)) score += 20;
  
  // Additional complexity
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 15;
  
  // Provide feedback
  if (password.length < 12) {
    feedback.push('Password should be at least 12 characters long');
  }
  if (!/[a-z]/.test(password)) {
    feedback.push('Add lowercase letters');
  }
  if (!/[A-Z]/.test(password)) {
    feedback.push('Add uppercase letters');
  }
  if (!/[0-9]/.test(password)) {
    feedback.push('Add numbers');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    feedback.push('Add special characters');
  }
  
  return { score: Math.min(100, score), feedback };
}
