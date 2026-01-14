-- ============================================
-- CURATOR METADATA EDITING - MIGRATION
-- Version: 3.0
-- Adds fields to track curator metadata edits
-- ============================================

-- Add curator metadata editing tracking to document_chunks
ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS metadata_edited BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS metadata_edited_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS metadata_edited_at TIMESTAMP WITH TIME ZONE;

-- Add comment for documentation
COMMENT ON COLUMN document_chunks.metadata_edited IS 'Whether metadata has been manually edited by a curator';
COMMENT ON COLUMN document_chunks.metadata_edited_by IS 'User who last edited the metadata';
COMMENT ON COLUMN document_chunks.metadata_edited_at IS 'When metadata was last edited by curator';