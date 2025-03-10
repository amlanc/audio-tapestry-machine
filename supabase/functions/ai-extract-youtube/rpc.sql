
-- Create a stored procedure to create the audio_files table if it doesn't exist
CREATE OR REPLACE FUNCTION public.create_audio_files_table_if_not_exists()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the table exists
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'audio_files'
  ) THEN
    -- Create the table if it doesn't exist
    CREATE TABLE public.audio_files (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      duration INTEGER NOT NULL,
      waveform FLOAT[] NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
    );
    
    -- Grant access to authenticated users
    ALTER TABLE public.audio_files ENABLE ROW LEVEL SECURITY;
    
    -- Allow all users to select, insert
    CREATE POLICY "Allow public access to audio_files"
      ON public.audio_files
      FOR ALL
      TO public
      USING (true);
  END IF;
END;
$$;
