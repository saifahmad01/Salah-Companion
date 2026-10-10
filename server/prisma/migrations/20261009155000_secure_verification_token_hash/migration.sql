-- Migration: Add secure verification token hash and rate limiting timestamp
-- 1. Add verificationTokenHash column for storing SHA-256 hashes of verification tokens
-- 2. Add lastVerificationSentAt column for enforcing cooldown rate limits on email resends
-- 3. Create index on verificationTokenHash for rapid O(1) lookups during email verification

ALTER TABLE "users" ADD COLUMN "verificationTokenHash" TEXT;
ALTER TABLE "users" ADD COLUMN "lastVerificationSentAt" DATETIME;

-- Migrate existing tokens if any existed in legacy verificationToken column
-- SQLite allows conditional updates
UPDATE "users" 
SET "verificationTokenHash" = "verificationToken" 
WHERE "verificationToken" IS NOT NULL AND "verificationTokenHash" IS NULL;

-- Create index on the hashed token
CREATE INDEX IF NOT EXISTS "users_verificationTokenHash_idx" ON "users"("verificationTokenHash");
