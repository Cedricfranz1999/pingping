-- Add optional size column to Product if missing
ALTER TABLE "public"."Product" ADD COLUMN IF NOT EXISTS "size" TEXT;

-- Product ratings table (idempotent create)
-- Create without FKs first to avoid failures when referenced tables are missing
CREATE TABLE IF NOT EXISTS "public"."ProductRating" (
  "id" SERIAL PRIMARY KEY,
  "productId" INTEGER NOT NULL,
  "userId" INTEGER,
  "rating" DOUBLE PRECISION NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add FKs conditionally if referenced tables exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Product'
  ) THEN
    ALTER TABLE "public"."ProductRating"
      ADD CONSTRAINT IF NOT EXISTS "ProductRating_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'User'
  ) THEN
    ALTER TABLE "public"."ProductRating"
      ADD CONSTRAINT IF NOT EXISTS "ProductRating_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL;
  END IF;
END $$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS "ProductRating_productId_idx" ON "public"."ProductRating" ("productId");
CREATE INDEX IF NOT EXISTS "ProductRating_userId_idx" ON "public"."ProductRating" ("userId");

-- Prevent exact duplicates by name+type+size where size provided
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Product'
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS product_name_type_size_uniq
    ON "public"."Product" ("name", "productType", "size");
  END IF;
END $$;
