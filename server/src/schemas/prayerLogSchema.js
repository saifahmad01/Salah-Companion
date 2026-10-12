import { z } from 'zod';

const validPrayerNames = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'juma', 'jumuah', "jumu'ah", 'jummah'];

export const logPrayerInputSchema = z.object({
  prayerName: z
    .string({ required_error: 'prayerName is required' })
    .trim()
    .refine(
      (val) => validPrayerNames.includes(val.toLowerCase()),
      {
        message: "prayerName must be one of: Fajr, Dhuhr, Juma, Jumu'ah, Asr, Maghrib, Isha",
      }
    ),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional(),
  status: z.enum(['on_time', 'late', 'qada', 'missed'], {
    required_error: 'status must be one of: on_time, late, qada, missed',
  }),
  notes: z.string().max(500).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  calculationMethod: z.string().optional().nullable(),
  madhab: z.string().optional().nullable(),
  jumuahTime: z.string().optional().nullable(),
  isCorrection: z.boolean().optional(),
});
