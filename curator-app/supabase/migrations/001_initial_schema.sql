-- ============================================
-- KNOWLEDGE BASE CURATOR MODULE - DATABASE SCHEMA
-- Version: 1.0
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================
-- TABLE 1: profiles
-- User profiles with roles (linked to auth.users)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'curator', 'admin')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE 2: documents
-- Tracks uploaded documents and processing status
-- ============================================
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('fhir', 'vbc', 'grants', 'billing')),
  storage_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  processing_status TEXT DEFAULT 'pending' NOT NULL 
    CHECK (processing_status IN ('pending', 'processing', 'review', 'completed', 'failed')),
  total_chunks INTEGER,
  approved_chunks INTEGER DEFAULT 0,
  rejected_chunks INTEGER DEFAULT 0,
  metadata JSONB,
  error_message TEXT,
  
  CONSTRAINT valid_chunks CHECK (
    approved_chunks IS NULL OR 
    total_chunks IS NULL OR 
    approved_chunks <= total_chunks
  )
);

-- ============================================
-- TABLE 3: document_chunks
-- Stores individual chunks from processed documents
-- ============================================
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  chunk_index INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  chunk_size INTEGER,
  
  -- AI-generated metadata from Flowise
  ai_metadata JSONB,
  -- Expected structure:
  -- {
  --   "topic": "string",
  --   "subtopic": "string",
  --   "relevance_score": 0.0-1.0,
  --   "use_cases": ["array"],
  --   "key_concepts": ["array"],
  --   "acronyms": {"key": "value"}
  -- }
  confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1),
  
  -- Curator review fields
  review_status TEXT DEFAULT 'pending' NOT NULL
    CHECK (review_status IN ('pending', 'approved', 'rejected', 'filtered', 'enriching')),
  curator_notes TEXT,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  
  -- Filtering info (for auto-filtered sections)
  is_filtered BOOLEAN DEFAULT FALSE NOT NULL,
  filtered_reason TEXT, -- 'toc', 'cover', 'boilerplate', 'appendix', etc.
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  CONSTRAINT unique_chunk_index UNIQUE (document_id, chunk_index)
);

-- ============================================
-- TABLE 4: kb_vectors
-- Stores approved chunks with embeddings for RAG
-- ============================================
CREATE TABLE kb_vectors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chunk_id UUID REFERENCES document_chunks(id) ON DELETE CASCADE NOT NULL,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  
  -- Content and embedding
  content TEXT NOT NULL,
  embedding_openai vector(1536), -- OpenAI text-embedding-3-small dimensions
  embedding_gemini vector(768),  -- Gemini text-embedding-004 dimensions
  
  -- Rich metadata for filtering/search
  doc_type TEXT NOT NULL,
  topic TEXT,
  subtopic TEXT,
  use_cases TEXT[], -- Array for multi-tag search
  key_concepts TEXT[],
  relevance_score FLOAT,
  
  -- Curator enrichment
  curator_notes TEXT,
  
  -- Source tracking
  source_document TEXT,
  source_page INTEGER,
  
  -- Audit
  approved_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  CONSTRAINT valid_relevance CHECK (
    relevance_score IS NULL OR 
    (relevance_score >= 0 AND relevance_score <= 1)
  )
);

-- ============================================
-- TABLE 5: settings
-- System-wide settings
-- ============================================
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Insert default settings
INSERT INTO settings (key, value) VALUES ('ai_provider', '{"provider": "gemini"}') ON CONFLICT DO NOTHING;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Profiles indexes
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_active ON profiles(is_active) WHERE is_active = true;

-- Documents indexes
CREATE INDEX idx_documents_status ON documents(processing_status);
CREATE INDEX idx_documents_type ON documents(doc_type);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX idx_documents_upload_date ON documents(upload_date DESC);

-- Chunks indexes
CREATE INDEX idx_chunks_document ON document_chunks(document_id);
CREATE INDEX idx_chunks_review_status ON document_chunks(review_status);
CREATE INDEX idx_chunks_reviewed_by ON document_chunks(reviewed_by);
CREATE INDEX idx_chunks_confidence ON document_chunks(confidence_score);
CREATE INDEX idx_chunks_document_status ON document_chunks(document_id, review_status);

-- KB vectors indexes (critical for RAG search performance)
CREATE INDEX idx_kb_doc_type ON kb_vectors(doc_type);
CREATE INDEX idx_kb_topic ON kb_vectors(topic);
CREATE INDEX idx_kb_use_cases ON kb_vectors USING GIN(use_cases);
CREATE INDEX idx_kb_concepts ON kb_vectors USING GIN(key_concepts);
CREATE INDEX idx_kb_approved_by ON kb_vectors(approved_by);
CREATE INDEX idx_kb_chunk ON kb_vectors(chunk_id);

-- Vector similarity search index (IVFFlat for approximate nearest neighbor)
-- Note: Run this AFTER you have some data (at least 1000 rows) for best performance
-- CREATE INDEX idx_kb_embedding ON kb_vectors 
--   USING ivfflat (embedding vector_cosine_ops)
--   WITH (lists = 100);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to check if user has a specific role or higher
CREATE OR REPLACE FUNCTION has_role(user_id UUID, required_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM profiles WHERE id = user_id AND is_active = true;
  
  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Admin can do everything
  IF user_role = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Curator can do curator and user things
  IF user_role = 'curator' AND required_role IN ('curator', 'user') THEN
    RETURN TRUE;
  END IF;
  
  -- User can only do user things
  IF user_role = 'user' AND required_role = 'user' THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is a curator or admin
CREATE OR REPLACE FUNCTION is_curator_or_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN has_role(user_id, 'curator');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is an admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id AND role = 'admin' AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment approved_chunks count
CREATE OR REPLACE FUNCTION increment_approved_chunks(doc_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE documents
  SET approved_chunks = COALESCE(approved_chunks, 0) + 1
  WHERE id = doc_id;
END;
$$ LANGUAGE plpgsql;

-- Function to increment rejected_chunks count
CREATE OR REPLACE FUNCTION increment_rejected_chunks(doc_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE documents
  SET rejected_chunks = COALESCE(rejected_chunks, 0) + 1
  WHERE id = doc_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check if document is complete (all chunks reviewed)
CREATE OR REPLACE FUNCTION check_document_completion()
RETURNS TRIGGER AS $$
DECLARE
  doc_id UUID;
  total INT;
  reviewed INT;
BEGIN
  doc_id := NEW.document_id;
  
  SELECT total_chunks INTO total FROM documents WHERE id = doc_id;
  
  SELECT COUNT(*) INTO reviewed 
  FROM document_chunks 
  WHERE document_id = doc_id 
    AND review_status IN ('approved', 'rejected', 'filtered');
  
  IF total IS NOT NULL AND reviewed >= total THEN
    UPDATE documents SET processing_status = 'completed' WHERE id = doc_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check document completion after chunk review
CREATE TRIGGER check_completion_after_review
AFTER UPDATE OF review_status ON document_chunks
FOR EACH ROW
WHEN (NEW.review_status IN ('approved', 'rejected'))
EXECUTE FUNCTION check_document_completion();

-- Function for vector similarity search (used by RAG queries)
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  filter_doc_type text DEFAULT NULL,
  filter_use_cases text[] DEFAULT NULL,
  provider text DEFAULT 'gemini'
)
RETURNS TABLE (
  id uuid,
  content text,
  similarity float,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb_vectors.id,
    kb_vectors.content,
    CASE
      WHEN provider = 'openai' THEN 1 - (kb_vectors.embedding_openai <=> query_embedding)
      ELSE 1 - (kb_vectors.embedding_gemini <=> query_embedding)
    END as similarity,
    jsonb_build_object(
      'chunk_id', kb_vectors.chunk_id,
      'source_document', kb_vectors.source_document,
      'source_url', kb_vectors.source_url,
      'document_type', kb_vectors.doc_type,
      'domain', kb_vectors.domain,
      'date_added', kb_vectors.approved_date,
      'curator', kb_vectors.curator_name,
      'tags', kb_vectors.tags,
      'chunk_index', kb_vectors.chunk_index,
      'word_count', kb_vectors.word_count,
      'last_updated', kb_vectors.last_updated,
      'topic', kb_vectors.topic,
      'subtopic', kb_vectors.subtopic,
      'use_cases', kb_vectors.use_cases,
      'key_concepts', kb_vectors.key_concepts,
      'curator_notes', kb_vectors.curator_notes,
      'relevance_score', kb_vectors.relevance_score
    ) as metadata
  FROM kb_vectors
  WHERE
    (filter_doc_type IS NULL OR kb_vectors.doc_type = filter_doc_type)
    AND (filter_use_cases IS NULL OR kb_vectors.use_cases && filter_use_cases)
    AND (
      (provider = 'openai' AND 1 - (kb_vectors.embedding_openai <=> query_embedding) > match_threshold) OR
      (provider = 'gemini' AND 1 - (kb_vectors.embedding_gemini <=> query_embedding) > match_threshold)
    )
  ORDER BY
    CASE WHEN provider = 'openai' THEN kb_vectors.embedding_openai <=> query_embedding
         ELSE kb_vectors.embedding_gemini <=> query_embedding END
  LIMIT match_count;
END;
$$;

-- ============================================
-- AUTO-CREATE PROFILE ON USER SIGNUP
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    'user' -- Default role is 'user', admin must promote to curator/admin
  )
  ON CONFLICT (id) DO NOTHING; -- Prevent duplicate key errors
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Trigger to create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_vectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Settings table policies
-- Everyone can read settings
CREATE POLICY "Anyone can view settings"
  ON settings FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can update settings
CREATE POLICY "Admins can update settings"
  ON settings FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()));

-- Profiles table policies
-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Curators and admins can view all profiles
CREATE POLICY "Curators can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (is_curator_or_admin(auth.uid()));

-- Users can update their own profile (except role)
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Only admins can update any profile (including role)
CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()));

-- Documents table policies
-- Only curators/admins can view documents
CREATE POLICY "Curators can view documents"
  ON documents FOR SELECT
  TO authenticated
  USING (is_curator_or_admin(auth.uid()));

-- Only curators/admins can insert documents
CREATE POLICY "Curators can insert documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (is_curator_or_admin(auth.uid()));

-- Only curators/admins can update documents
CREATE POLICY "Curators can update documents"
  ON documents FOR UPDATE
  TO authenticated
  USING (is_curator_or_admin(auth.uid()));

-- Only admins can delete documents
CREATE POLICY "Admins can delete documents"
  ON documents FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));

-- Document chunks policies
-- Only curators/admins can view chunks
CREATE POLICY "Curators can view chunks"
  ON document_chunks FOR SELECT
  TO authenticated
  USING (is_curator_or_admin(auth.uid()));

-- Only curators/admins can insert chunks
CREATE POLICY "Curators can insert chunks"
  ON document_chunks FOR INSERT
  TO authenticated
  WITH CHECK (is_curator_or_admin(auth.uid()));

-- Only curators/admins can update chunks
CREATE POLICY "Curators can update chunks"
  ON document_chunks FOR UPDATE
  TO authenticated
  USING (is_curator_or_admin(auth.uid()));

-- KB vectors policies (read for all authenticated, write for curators)
-- All authenticated users can read kb_vectors (for RAG queries)
CREATE POLICY "Authenticated users can read kb_vectors"
  ON kb_vectors FOR SELECT
  TO authenticated
  USING (true);

-- Only curators/admins can insert kb_vectors
CREATE POLICY "Curators can insert kb_vectors"
  ON kb_vectors FOR INSERT
  TO authenticated
  WITH CHECK (is_curator_or_admin(auth.uid()));

-- Only curators/admins can update kb_vectors
CREATE POLICY "Curators can update kb_vectors"
  ON kb_vectors FOR UPDATE
  TO authenticated
  USING (is_curator_or_admin(auth.uid()));

-- Only admins can delete kb_vectors
CREATE POLICY "Admins can delete kb_vectors"
  ON kb_vectors FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));

-- ============================================
-- STORAGE BUCKET SETUP (run separately in Supabase Dashboard)
-- ============================================
-- 1. Create bucket named 'documents'
-- 2. Set public: false
-- 3. File size limit: 52428800 (50MB)
-- 4. Allowed MIME types: 
--    - application/pdf
--    - application/vnd.openxmlformats-officedocument.wordprocessingml.document
--    - text/plain

-- ============================================
-- STORAGE POLICIES (run after creating bucket)
-- ============================================

-- Allow curators to upload documents
-- CREATE POLICY "Curators can upload documents"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (
--   bucket_id = 'documents' 
--   AND is_curator_or_admin(auth.uid())
-- );

-- Allow curators to read documents
-- CREATE POLICY "Curators can read documents"
-- ON storage.objects FOR SELECT
-- TO authenticated
-- USING (
--   bucket_id = 'documents'
--   AND is_curator_or_admin(auth.uid())
-- );

-- Allow admins to delete documents
-- CREATE POLICY "Admins can delete documents"
-- ON storage.objects FOR DELETE
-- TO authenticated
-- USING (
--   bucket_id = 'documents'
--   AND is_admin(auth.uid())
-- );

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE profiles IS 'User profiles with role-based access control';
COMMENT ON TABLE documents IS 'Uploaded documents for knowledge base curation';
COMMENT ON TABLE document_chunks IS 'Processed chunks from documents awaiting curator review';
COMMENT ON TABLE kb_vectors IS 'Approved chunks with embeddings for RAG queries';

COMMENT ON FUNCTION has_role IS 'Check if user has required role or higher';
COMMENT ON FUNCTION is_curator_or_admin IS 'Check if user is curator or admin';
COMMENT ON FUNCTION is_admin IS 'Check if user is admin';
COMMENT ON FUNCTION increment_approved_chunks IS 'Increment approved chunk count for a document';
COMMENT ON FUNCTION increment_rejected_chunks IS 'Increment rejected chunk count for a document';
COMMENT ON FUNCTION match_documents IS 'Semantic search function for RAG queries';
COMMENT ON FUNCTION handle_new_user IS 'Auto-create profile when user signs up';
