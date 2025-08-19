-- Add attachments field to tasks table
-- This migration adds support for file attachments to tasks

-- Add attachments column to tasks table
-- Using JSONB for flexible storage of attachment metadata
ALTER TABLE tasks 
ADD COLUMN attachments JSONB DEFAULT '[]'::jsonb;

-- Add index on attachments for better query performance
CREATE INDEX idx_tasks_attachments ON tasks USING GIN (attachments);

-- Add comment for documentation
COMMENT ON COLUMN tasks.attachments IS 'JSON array of file attachments with metadata (filename, url, size, type, uploaded_at)';

-- Example attachment structure:
-- [
--   {
--     "id": "unique-file-id",
--     "filename": "document.pdf",
--     "original_name": "My Document.pdf", 
--     "url": "https://storage-url/path/to/file",
--     "size": 1024000,
--     "type": "application/pdf",
--     "uploaded_at": "2024-01-01T12:00:00Z"
--   }
-- ]

-- Optional: Create storage bucket for attachments if not exists
-- Run this in Supabase dashboard SQL editor or via RLS policies
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS (Row Level Security) policies for the storage bucket
-- Users can only access their own task attachments
CREATE POLICY "Users can upload task attachments" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'task-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their task attachments" ON storage.objects
FOR SELECT USING (
  bucket_id = 'task-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their task attachments" ON storage.objects
FOR DELETE USING (
  bucket_id = 'task-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Note: Execute these SQL statements in your Supabase dashboard:
-- 1. Go to SQL Editor in Supabase dashboard
-- 2. Run the ALTER TABLE statement first
-- 3. Run the storage bucket and policy statements
-- 4. Verify the bucket exists in Storage section