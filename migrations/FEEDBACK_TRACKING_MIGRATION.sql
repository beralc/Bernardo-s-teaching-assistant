-- Feedback Tracking Migration for Phase 4
-- Run this in Supabase SQL Editor

-- Table to store feedback analysis results per session
CREATE TABLE IF NOT EXISTS session_feedback_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES conversation_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Analysis metadata
    analyzed_at TIMESTAMPTZ DEFAULT NOW(),
    model_used TEXT DEFAULT 'gpt-4o',
    processing_time_ms INTEGER,

    -- Summary counts
    total_ai_turns INTEGER DEFAULT 0,
    recasts_count INTEGER DEFAULT 0,
    expansions_count INTEGER DEFAULT 0,
    explicit_corrections_count INTEGER DEFAULT 0,
    uptake_instances INTEGER DEFAULT 0,
    modified_output_instances INTEGER DEFAULT 0,

    -- Full analysis JSON
    feedback_sequences JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table to store individual feedback instances (normalized for easier querying)
CREATE TABLE IF NOT EXISTS feedback_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES conversation_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    analysis_id UUID REFERENCES session_feedback_analysis(id) ON DELETE CASCADE,

    -- Turn information
    turn_number INTEGER NOT NULL,

    -- Feedback classification
    feedback_type TEXT CHECK (feedback_type IN ('recast', 'expansion', 'explicit_correction', 'none')),

    -- The actual content
    learner_utterance TEXT,
    learner_error TEXT,
    ai_response TEXT,
    corrected_form TEXT,

    -- Uptake detection (in following learner turn)
    uptake_detected BOOLEAN DEFAULT FALSE,
    uptake_type TEXT CHECK (uptake_type IN ('successful', 'partial', 'none', 'not_applicable')),
    modified_output BOOLEAN DEFAULT FALSE,

    -- Evidence
    confidence_score DECIMAL(3,2),
    evidence_notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_feedback_analysis_session ON session_feedback_analysis(session_id);
CREATE INDEX IF NOT EXISTS idx_feedback_analysis_user ON session_feedback_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_instances_session ON feedback_instances(session_id);
CREATE INDEX IF NOT EXISTS idx_feedback_instances_type ON feedback_instances(feedback_type);
CREATE INDEX IF NOT EXISTS idx_feedback_instances_uptake ON feedback_instances(uptake_detected);

-- RLS Policies
ALTER TABLE session_feedback_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_instances ENABLE ROW LEVEL SECURITY;

-- Users can view their own feedback analysis
CREATE POLICY "Users can view own feedback analysis"
    ON session_feedback_analysis FOR SELECT
    USING (auth.uid() = user_id);

-- Admins can view all feedback analysis
CREATE POLICY "Admins can view all feedback analysis"
    ON session_feedback_analysis FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

-- Service role can insert (for backend analysis)
CREATE POLICY "Service can insert feedback analysis"
    ON session_feedback_analysis FOR INSERT
    WITH CHECK (true);

-- Same policies for feedback_instances
CREATE POLICY "Users can view own feedback instances"
    ON feedback_instances FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all feedback instances"
    ON feedback_instances FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

CREATE POLICY "Service can insert feedback instances"
    ON feedback_instances FOR INSERT
    WITH CHECK (true);

-- Grant permissions
GRANT ALL ON session_feedback_analysis TO authenticated;
GRANT ALL ON session_feedback_analysis TO service_role;
GRANT ALL ON feedback_instances TO authenticated;
GRANT ALL ON feedback_instances TO service_role;
