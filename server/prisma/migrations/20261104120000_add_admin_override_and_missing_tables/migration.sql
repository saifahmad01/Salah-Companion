-- AlterTable: Add is_admin_override and qada_completed_at to prayer_logs
ALTER TABLE "prayer_logs" ADD COLUMN IF NOT EXISTS "is_admin_override" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "prayer_logs" ADD COLUMN IF NOT EXISTS "qada_completed_at" TIMESTAMPTZ;

-- CreateIndex: Add index on (user_id, status) for prayer_logs
CREATE INDEX IF NOT EXISTS "prayer_logs_user_id_status_idx" ON "prayer_logs"("user_id", "status");
CREATE INDEX IF NOT EXISTS "idx_prayer_logs_user_status" ON "prayer_logs"("user_id", "status");

-- CreateTable: quran_reading_logs
CREATE TABLE IF NOT EXISTS "quran_reading_logs" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "user_id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "surah_name" TEXT NOT NULL,
    "start_page" INTEGER NOT NULL,
    "end_page" INTEGER NOT NULL,
    "start_ruku" INTEGER NOT NULL,
    "end_ruku" INTEGER NOT NULL,
    "pages_read" INTEGER NOT NULL,
    "rukus_read" INTEGER NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quran_reading_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: quran_reading_logs
CREATE INDEX IF NOT EXISTS "quran_reading_logs_user_id_date_idx" ON "quran_reading_logs"("user_id", "date");

-- AddForeignKey: quran_reading_logs -> users
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'quran_reading_logs_user_id_fkey'
    ) THEN
        ALTER TABLE "quran_reading_logs" ADD CONSTRAINT "quran_reading_logs_user_id_fkey" 
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateTable: user_word_progress
CREATE TABLE IF NOT EXISTS "user_word_progress" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "user_id" TEXT NOT NULL,
    "word_id" INTEGER NOT NULL,
    "is_learned" BOOLEAN NOT NULL DEFAULT false,
    "is_bookmarked" BOOLEAN NOT NULL DEFAULT false,
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "last_reviewed" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_word_progress_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_word_progress_user_id_word_id_key" UNIQUE ("user_id", "word_id")
);

-- CreateIndex: user_word_progress
CREATE INDEX IF NOT EXISTS "user_word_progress_user_id_idx" ON "user_word_progress"("user_id");

-- AddForeignKey: user_word_progress -> users
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_word_progress_user_id_fkey'
    ) THEN
        ALTER TABLE "user_word_progress" ADD CONSTRAINT "user_word_progress_user_id_fkey" 
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
