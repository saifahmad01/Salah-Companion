import { z } from 'zod';

export const createReadingLogSchema = z
  .object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD')
      .optional(),
    surahName: z
      .string()
      .trim()
      .min(1, 'Surah name is required')
      .max(120, 'Surah name too long'),
    startPage: z
      .number({ invalid_type_error: 'Starting page must be a number' })
      .int('Starting page must be an integer')
      .min(1, 'Starting page must be at least 1')
      .max(1000, 'Starting page cannot exceed 1000'),
    endPage: z
      .number({ invalid_type_error: 'Ending page must be a number' })
      .int('Ending page must be an integer')
      .min(1, 'Ending page must be at least 1')
      .max(1000, 'Ending page cannot exceed 1000'),
    startRuku: z
      .number({ invalid_type_error: 'Starting Ruku must be a number' })
      .int('Starting Ruku must be an integer')
      .min(1, 'Starting Ruku must be at least 1')
      .max(600, 'Starting Ruku cannot exceed 600'),
    endRuku: z
      .number({ invalid_type_error: 'Ending Ruku must be a number' })
      .int('Ending Ruku must be an integer')
      .min(1, 'Ending Ruku must be at least 1')
      .max(600, 'Ending Ruku cannot exceed 600'),
    notes: z
      .string()
      .trim()
      .max(1000, 'Notes cannot exceed 1000 characters')
      .optional()
      .nullable(),
  })
  .refine((data) => data.endPage >= data.startPage, {
    message: 'Ending page must be greater than or equal to starting page',
    path: ['endPage'],
  })
  .refine((data) => data.endRuku >= data.startRuku, {
    message: 'Ending Ruku must be greater than or equal to starting Ruku',
    path: ['endRuku'],
  });

export const updateWordProgressSchema = z.object({
  isLearned: z.boolean().optional(),
  isBookmarked: z.boolean().optional(),
});
