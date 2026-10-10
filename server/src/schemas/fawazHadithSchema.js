import { z } from 'zod';

/**
 * Common Hadith Books supported by Fawaz Ahmed API
 */
export const SUPPORTED_HADITH_BOOKS = [
  'bukhari',
  'muslim',
  'abudawud',
  'tirmidhi',
  'nasai',
  'ibnmajah',
  'malik',
  'nawawi',
  'qudsi',
  'dehlawi',
];

/**
 * Validation schema for GET /api/hadith/single
 */
export const singleHadithQuerySchema = z.object({
  edition: z
    .string()
    .trim()
    .min(3, 'Edition must be at least 3 characters long (e.g., "eng-bukhari", "ara-muslim")')
    .default('eng-bukhari'),
  hadithNumber: z.coerce
    .number({
      required_error: 'hadithNumber is required',
      invalid_type_error: 'hadithNumber must be a valid number',
    })
    .int('hadithNumber must be an integer')
    .positive('hadithNumber must be greater than 0'),
});

/**
 * Validation schema for GET /api/hadith/bilingual
 */
export const bilingualHadithQuerySchema = z.object({
  book: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, 'Book name must be at least 2 characters (e.g., "bukhari", "muslim")')
    .default('bukhari'),
  hadithNumber: z.coerce
    .number({
      required_error: 'hadithNumber is required',
      invalid_type_error: 'hadithNumber must be a valid number',
    })
    .int('hadithNumber must be an integer')
    .positive('hadithNumber must be greater than 0'),
});

/**
 * Validation schema for GET /api/hadith/daily
 */
export const dailyHadithQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional(),
  edition: z
    .string()
    .trim()
    .default('eng-bukhari')
    .optional(),
});
