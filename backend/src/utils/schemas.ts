import { z } from 'zod';

// Auth Schemas
export const RegisterSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters long' })
    .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
    .regex(/[0-9]/, { message: 'Password must contain at least one number' }),
  name: z.string().min(2, { message: 'Name must be at least 2 characters long' }),
  role: z.enum(['customer', 'tailor', 'admin'], { message: 'Invalid role selected' }),
  phone: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
});

export const LoginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

export const OAuthSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  authProvider: z.string().min(1, { message: 'Auth provider is required' }),
  providerId: z.string().min(1, { message: 'Provider ID is required' }),
  name: z.string().optional(),
  role: z.enum(['customer', 'tailor', 'admin']).optional(),
});

// Service Request Schemas
export const CreateRequestSchema = z.object({
  tailorId: z.string().min(1, { message: 'Tailor ID is required' }),
  garmentType: z.string().min(2, { message: 'Garment type must be specified' }),
  budget: z.coerce.number().positive({ message: 'Budget must be greater than 0' }).optional().nullable(),
  deadline: z
    .string()
    .optional()
    .nullable()
    .refine(
      (val) => {
        if (!val) return true;
        const d = new Date(val);
        return !isNaN(d.getTime()) && d.getTime() > Date.now() - 86400000;
      },
      { message: 'Deadline date must be in the future' }
    ),
  fabricPreference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// Negotiation Schemas
export const ProposeNegotiationSchema = z.object({
  proposedPrice: z.coerce.number().positive({ message: 'Proposed price must be greater than 0' }).optional().nullable(),
  proposedDeadline: z
    .string()
    .optional()
    .nullable()
    .refine(
      (val) => {
        if (!val) return true;
        const d = new Date(val);
        return !isNaN(d.getTime()) && d.getTime() > Date.now() - 86400000;
      },
      { message: 'Proposed deadline date must be in the future' }
    ),
  garmentSpecs: z.union([z.record(z.any()), z.string()]).optional().nullable(),
  notes: z.string().optional().nullable(),
});

// Measurement Schemas
export const MeasurementPhotoSchema = z.object({
  frontPhotoUrl: z.string().url({ message: 'Invalid front photo URL' }).optional().or(z.literal('')),
  sidePhotoUrl: z.string().url({ message: 'Invalid side photo URL' }).optional().or(z.literal('')),
  backPhotoUrl: z.string().url({ message: 'Invalid back photo URL' }).optional().or(z.literal('')),
});

export const MeasurementAdjustmentSchema = z.object({
  chest: z.coerce.number().min(20).max(300).optional().nullable(),
  waist: z.coerce.number().min(20).max(300).optional().nullable(),
  hip: z.coerce.number().min(20).max(300).optional().nullable(),
  inseam: z.coerce.number().min(10).max(200).optional().nullable(),
  shoulderWidth: z.coerce.number().min(10).max(150).optional().nullable(),
  armLength: z.coerce.number().min(10).max(150).optional().nullable(),
  adjustments: z.any().optional(),
});

// Tailor Profile Schemas
export const UpdateTailorProfileSchema = z
  .object({
    bio: z.string().optional().nullable(),
    specialties: z.array(z.string()).optional().nullable(),
    basePricingMin: z.coerce.number().min(0, { message: 'Min price cannot be negative' }).optional().nullable(),
    basePricingMax: z.coerce.number().min(0, { message: 'Max price cannot be negative' }).optional().nullable(),
    portfolioImages: z.array(z.string()).optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.basePricingMin != null && data.basePricingMax != null) {
        return Number(data.basePricingMax) >= Number(data.basePricingMin);
      }
      return true;
    },
    { message: 'Maximum price must be greater than or equal to minimum price', path: ['basePricingMax'] }
  );

// Review Schemas
export const CreateReviewSchema = z.object({
  rating: z.coerce.number().int().min(1, { message: 'Rating must be at least 1' }).max(5, { message: 'Rating cannot exceed 5' }),
  feedback: z.string().optional().nullable(),
});

export const ReplyReviewSchema = z.object({
  tailorReply: z.string().min(1, { message: 'Reply text cannot be empty' }),
});

// User Profile Schemas
export const UpdateUserSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }).optional(),
  phone: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  avatarUrl: z.string().url({ message: 'Invalid avatar URL' }).optional().or(z.literal('')).nullable(),
});

export const SwitchRoleSchema = z.object({
  role: z.enum(['customer', 'tailor', 'admin'], { message: 'Invalid role' }),
});
