-- Create presentations table
CREATE TABLE IF NOT EXISTS public.presentations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create page_interactions table
CREATE TABLE IF NOT EXISTS public.page_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  presentation_id UUID NOT NULL REFERENCES public.presentations(id) ON DELETE CASCADE,
  page_number INT NOT NULL,
  question_type TEXT NOT NULL,
  voting_style TEXT NOT NULL DEFAULT 'standard_poll',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create presentation_state table
CREATE TABLE IF NOT EXISTS public.presentation_state (
  presentation_id UUID PRIMARY KEY REFERENCES public.presentations(id) ON DELETE CASCADE,
  current_page_number INT NOT NULL DEFAULT 1,
  active_interaction_id UUID REFERENCES public.page_interactions(id),
  is_voting_open BOOLEAN DEFAULT false,
  show_results_to_audience BOOLEAN DEFAULT false,
  are_answers_locked BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create votes collection table for responses
CREATE TABLE IF NOT EXISTS public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id UUID NOT NULL REFERENCES public.page_interactions(id) ON DELETE CASCADE,
  participant_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Supabase Realtime tracking on state updates and votes
ALTER PUBLICATION supabase_realtime ADD TABLE public.presentation_state;
ALTER PUBLICATION supabase_realtime ADD TABLE public.votes;