-- Step 1: Remove default values first
ALTER TABLE public.phd_lmd_certificates ALTER COLUMN mention DROP DEFAULT;
ALTER TABLE public.phd_science_certificates ALTER COLUMN mention DROP DEFAULT;
ALTER TABLE public.master_certificates ALTER COLUMN mention DROP DEFAULT;

-- Step 2: Convert columns to text
ALTER TABLE public.phd_lmd_certificates ALTER COLUMN mention TYPE text;
ALTER TABLE public.phd_science_certificates ALTER COLUMN mention TYPE text;
ALTER TABLE public.master_certificates ALTER COLUMN mention TYPE text;

-- Step 3: Update existing data to new mention values
UPDATE public.phd_lmd_certificates SET mention = 'very_honorable' WHERE mention IN ('excellent', 'very_good');
UPDATE public.phd_lmd_certificates SET mention = 'honorable' WHERE mention IN ('good', 'fairly_good', 'passable');

UPDATE public.phd_science_certificates SET mention = 'very_honorable' WHERE mention IN ('excellent', 'very_good');
UPDATE public.phd_science_certificates SET mention = 'honorable' WHERE mention IN ('good', 'fairly_good', 'passable');

UPDATE public.master_certificates SET mention = 'very_honorable' WHERE mention IN ('excellent', 'very_good');
UPDATE public.master_certificates SET mention = 'honorable' WHERE mention IN ('good', 'fairly_good', 'passable');

-- Step 4: Drop the old enum
DROP TYPE public.mention_type;

-- Step 5: Create the new enum with only two values (مشرف = honorable, مشرف جدا = very_honorable)
CREATE TYPE public.mention_type AS ENUM ('honorable', 'very_honorable');

-- Step 6: Convert columns back to enum with new default
ALTER TABLE public.phd_lmd_certificates ALTER COLUMN mention TYPE public.mention_type USING mention::public.mention_type;
ALTER TABLE public.phd_lmd_certificates ALTER COLUMN mention SET DEFAULT 'honorable'::public.mention_type;

ALTER TABLE public.phd_science_certificates ALTER COLUMN mention TYPE public.mention_type USING mention::public.mention_type;
ALTER TABLE public.phd_science_certificates ALTER COLUMN mention SET DEFAULT 'honorable'::public.mention_type;

ALTER TABLE public.master_certificates ALTER COLUMN mention TYPE public.mention_type USING mention::public.mention_type;
ALTER TABLE public.master_certificates ALTER COLUMN mention SET DEFAULT 'honorable'::public.mention_type;