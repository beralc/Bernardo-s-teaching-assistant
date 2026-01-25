-- ============================================================================
-- Can-Do Checklist Database Schema for PhD Research
-- ============================================================================
-- This schema tracks learner progress through CEFR Can-Do statements
-- Supports automatic AI detection and manual admin review
-- ============================================================================

-- ============================================================================
-- Table 1: Can-Do Statements (Master Reference)
-- ============================================================================
CREATE TABLE IF NOT EXISTS cando_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- CEFR Classification
  level TEXT NOT NULL CHECK (level IN ('A1', 'A2', 'A2+', 'B1', 'B1+', 'B2', 'B2+', 'C1', 'C2')),
  skill_type TEXT NOT NULL CHECK (skill_type IN ('speaking', 'listening', 'interaction')),

  -- Original CEFR data
  mode TEXT NOT NULL, -- 'Production', 'Reception', 'Interaction'
  activity TEXT NOT NULL, -- 'Oral production', 'Oral comprehension', etc.
  scale TEXT, -- Specific CEFR scale name

  -- The actual Can-Do statement
  descriptor TEXT NOT NULL,

  -- For AI detection
  keywords TEXT[], -- Array of keywords to help AI identify when this is demonstrated

  -- Sorting and organization
  display_order INTEGER, -- Order to display statements within a level

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cando_level ON cando_statements(level);
CREATE INDEX IF NOT EXISTS idx_cando_skill ON cando_statements(skill_type);
CREATE INDEX IF NOT EXISTS idx_cando_level_skill ON cando_statements(level, skill_type);

-- ============================================================================
-- Table 2: User Can-Do Achievements
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_cando_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cando_id UUID NOT NULL REFERENCES cando_statements(id) ON DELETE CASCADE,

  -- Achievement metadata
  achieved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  detected_by TEXT NOT NULL CHECK (detected_by IN ('ai_automatic', 'admin_manual', 'ai_suggested')),

  -- AI detection data (for research analysis)
  session_id TEXT, -- Which voice session it was detected in
  confidence_score DECIMAL(3,2), -- AI confidence (0.00 to 1.00)
  evidence_text TEXT, -- Excerpt from conversation showing competence

  -- Admin review (if using AI suggestions)
  reviewed_by_admin BOOLEAN DEFAULT FALSE,
  admin_approved BOOLEAN, -- TRUE = approved, FALSE = rejected, NULL = pending review
  admin_notes TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,

  -- Constraints
  UNIQUE(user_id, cando_id), -- User can only achieve each statement once

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_achievements_user ON user_cando_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_cando ON user_cando_achievements(cando_id);
CREATE INDEX IF NOT EXISTS idx_achievements_user_detected ON user_cando_achievements(user_id, detected_by);
CREATE INDEX IF NOT EXISTS idx_achievements_pending_review ON user_cando_achievements(user_id, admin_approved)
  WHERE admin_approved IS NULL;

-- ============================================================================
-- Table 3: Session Can-Do Analysis Log (For Research)
-- ============================================================================
-- This table logs every AI analysis attempt for research purposes
CREATE TABLE IF NOT EXISTS session_cando_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Session info
  session_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Analysis results
  analysis_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  transcript_length INTEGER, -- Number of characters in transcript
  detected_achievements JSONB, -- Array of {cando_id, confidence, evidence}

  -- AI model info (for research reproducibility)
  model_used TEXT, -- e.g., 'gpt-4-turbo'
  prompt_version TEXT, -- Version of detection prompt used

  -- Processing metadata
  processing_time_ms INTEGER, -- How long the analysis took
  error_occurred BOOLEAN DEFAULT FALSE,
  error_message TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analysis_user ON session_cando_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_session ON session_cando_analysis(session_id);
CREATE INDEX IF NOT EXISTS idx_analysis_timestamp ON session_cando_analysis(analysis_timestamp);

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE cando_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_cando_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_cando_analysis ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policies: cando_statements (Read-only for all authenticated users)
-- ============================================================================

-- Anyone authenticated can read Can-Do statements
CREATE POLICY "Anyone can read Can-Do statements"
  ON cando_statements
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can modify statements
CREATE POLICY "Admins can modify Can-Do statements"
  ON cando_statements
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- ============================================================================
-- RLS Policies: user_cando_achievements
-- ============================================================================

-- Users can read their own achievements
CREATE POLICY "Users can read own achievements"
  ON user_cando_achievements
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can read all achievements
CREATE POLICY "Admins can read all achievements"
  ON user_cando_achievements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Only service role (backend) can insert achievements
-- (Users and admins will use backend API endpoints)
CREATE POLICY "Service role can insert achievements"
  ON user_cando_achievements
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Admins can update achievements (for review/approval)
CREATE POLICY "Admins can update achievements"
  ON user_cando_achievements
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- ============================================================================
-- RLS Policies: session_cando_analysis
-- ============================================================================

-- Users can read their own analysis logs
CREATE POLICY "Users can read own analysis logs"
  ON session_cando_analysis
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can read all analysis logs (for research)
CREATE POLICY "Admins can read all analysis logs"
  ON session_cando_analysis
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Only service role (backend) can insert analysis logs
CREATE POLICY "Service role can insert analysis logs"
  ON session_cando_analysis
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to get user's achievement progress by level
CREATE OR REPLACE FUNCTION get_user_cando_progress(p_user_id UUID, p_level TEXT)
RETURNS TABLE (
  total_statements INTEGER,
  achieved_statements INTEGER,
  percentage DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(cs.id)::INTEGER as total_statements,
    COUNT(uca.id)::INTEGER as achieved_statements,
    ROUND((COUNT(uca.id)::DECIMAL / NULLIF(COUNT(cs.id), 0)) * 100, 2) as percentage
  FROM cando_statements cs
  LEFT JOIN user_cando_achievements uca
    ON cs.id = uca.cando_id
    AND uca.user_id = p_user_id
    AND (uca.admin_approved IS NULL OR uca.admin_approved = TRUE) -- Only count approved/auto achievements
  WHERE cs.level = p_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get next achievable Can-Do statements (ZPD)
CREATE OR REPLACE FUNCTION get_next_cando_statements(p_user_id UUID, p_current_level TEXT, p_limit INTEGER DEFAULT 5)
RETURNS TABLE (
  id UUID,
  level TEXT,
  skill_type TEXT,
  descriptor TEXT,
  is_achieved BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cs.id,
    cs.level,
    cs.skill_type,
    cs.descriptor,
    (uca.id IS NOT NULL) as is_achieved
  FROM cando_statements cs
  LEFT JOIN user_cando_achievements uca
    ON cs.id = uca.cando_id
    AND uca.user_id = p_user_id
  WHERE cs.level = p_current_level
    AND uca.id IS NULL -- Not yet achieved
  ORDER BY cs.display_order, cs.id
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Triggers
-- ============================================================================

-- Update timestamp on cando_statements changes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cando_statements_updated_at
  BEFORE UPDATE ON cando_statements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE cando_statements IS 'Master table of CEFR Can-Do descriptors for speaking/listening/interaction';
COMMENT ON TABLE user_cando_achievements IS 'Tracks which Can-Do statements each user has achieved';
COMMENT ON TABLE session_cando_analysis IS 'Logs AI analysis attempts for research purposes';

COMMENT ON COLUMN user_cando_achievements.detected_by IS 'ai_automatic: AI detected and auto-approved, ai_suggested: AI suggested pending admin review, admin_manual: Admin manually added';
COMMENT ON COLUMN user_cando_achievements.confidence_score IS 'AI confidence score 0.00-1.00, higher = more confident';
COMMENT ON COLUMN user_cando_achievements.evidence_text IS 'Excerpt from conversation transcript showing the competence';

-- ============================================================================
-- End of Schema
-- ============================================================================
