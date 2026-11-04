-- CreateTable: salah_correction_requests
CREATE TABLE IF NOT EXISTS "salah_correction_requests" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT (gen_random_uuid())::text,
    "user_id" TEXT NOT NULL,
    "prayer_log_id" TEXT,
    "prayer_name" TEXT NOT NULL,
    "prayer_date" TEXT NOT NULL,
    "previous_status" TEXT NOT NULL DEFAULT 'missed',
    "requested_status" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMPTZ,
    "rejection_reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "salah_correction_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "salah_correction_requests_prayer_log_id_fkey" FOREIGN KEY ("prayer_log_id") REFERENCES "prayer_logs" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "salah_correction_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "salah_correction_requests_user_id_status_idx" ON "salah_correction_requests"("user_id", "status");
CREATE INDEX IF NOT EXISTS "salah_correction_requests_status_created_at_idx" ON "salah_correction_requests"("status", "created_at");
CREATE INDEX IF NOT EXISTS "salah_correction_requests_prayer_date_idx" ON "salah_correction_requests"("prayer_date");
