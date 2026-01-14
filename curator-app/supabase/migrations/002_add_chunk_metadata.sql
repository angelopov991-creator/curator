-- ============================================
-- ENHANCED CHUNK METADATA - MIGRATION
-- Version: 2.0
-- Adds comprehensive metadata fields to kb_vectors table
-- ============================================

-- Add new metadata columns to kb_vectors table
ALTER TABLE kb_vectors ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE kb_vectors ADD COLUMN IF NOT EXISTS domain TEXT;
ALTER TABLE kb_vectors ADD COLUMN IF NOT EXISTS curator_name TEXT;
ALTER TABLE kb_vectors ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE kb_vectors ADD COLUMN IF NOT EXISTS chunk_index INTEGER;
ALTER TABLE kb_vectors ADD COLUMN IF NOT EXISTS word_count INTEGER;
ALTER TABLE kb_vectors ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add comment for documentation
COMMENT ON TABLE kb_vectors IS 'Approved chunks with embeddings and comprehensive metadata for RAG queries';

-- Update existing records to populate curator_name from profiles
UPDATE kb_vectors
SET curator_name = profiles.full_name
FROM profiles
WHERE kb_vectors.approved_by = profiles.id;

-- Update existing records to set last_updated to approved_date initially
UPDATE kb_vectors
SET last_updated = approved_date
WHERE last_updated IS NULL;

-- Add index for new fields
CREATE INDEX IF NOT EXISTS idx_kb_domain ON kb_vectors(domain);
CREATE INDEX IF NOT EXISTS idx_kb_tags ON kb_vectors USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_kb_curator_name ON kb_vectors(curator_name);
CREATE INDEX IF NOT EXISTS idx_kb_last_updated ON kb_vectors(last_updated DESC);