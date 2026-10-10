-- Migration: Create PendingRegistration table for creating account only after email verification
CREATE TABLE IF NOT EXISTS "pending_registrations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL UNIQUE,
    "password" TEXT NOT NULL,
    "prayerCalculationMethod" TEXT NOT NULL DEFAULT 'Karachi',
    "latitude" REAL,
    "longitude" REAL,
    "tokenHash" TEXT NOT NULL UNIQUE,
    "expiresAt" DATETIME NOT NULL,
    "lastSentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS "pending_registrations_email_idx" ON "pending_registrations"("email");
CREATE INDEX IF NOT EXISTS "pending_registrations_tokenHash_idx" ON "pending_registrations"("tokenHash");
