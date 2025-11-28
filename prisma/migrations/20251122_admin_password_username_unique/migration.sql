-- Normalize Admin password field and enforce unique username
-- Rename column "Password" -> "password"
ALTER TABLE "public"."Admin" RENAME COLUMN "Password" TO "password";

-- Drop non-unique username index if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'Admin_username_idx'
  ) THEN
    DROP INDEX "public"."Admin_username_idx";
  END IF;
END $$;

-- Create unique index on username
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'Admin_username_key'
  ) THEN
    CREATE UNIQUE INDEX "Admin_username_key" ON "public"."Admin"("username");
  END IF;
END $$;

