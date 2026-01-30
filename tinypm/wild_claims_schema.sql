-- ===============================================================================
-- WILD CLAIMS CZAR - DATABASE SCHEMA
-- ===============================================================================
--
-- "THE SPECIMEN VAULT MUST BE ORGANIZED FOR SCIENCE!"
--
-- This schema supports the Wild Claims Czar multi-agent research system.
-- Paste this into your Supabase SQL Editor to create the tables.
--
-- Created: 2026-01-30
-- Author: The Mad Scientist
-- ===============================================================================

-- ===============================================================================
-- CLAIMS TABLE - The Specimen Collection
-- ===============================================================================

CREATE TABLE IF NOT EXISTS wild_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Source information
    source_type VARCHAR(50) NOT NULL,  -- reddit, arxiv, twitter, youtube, hackernews
    source_url TEXT,

    -- Claim content
    title TEXT NOT NULL,
    content TEXT,
    author VARCHAR(255),

    -- Discovery metadata
    discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Scoring
    wildness_score DECIMAL(3,1) DEFAULT 5.0,  -- 0-10 scale
    claim_type VARCHAR(50),  -- performance, novelty, technique, insider, research

    -- Status tracking
    status VARCHAR(50) DEFAULT 'discovered',  -- discovered, validating, validated, rejected, integrated
    validation_score DECIMAL(3,2),  -- 0-1 scale after validation

    -- Structured data
    extracted_claims JSONB DEFAULT '[]'::jsonb,
    engagement JSONB DEFAULT '{}'::jsonb,  -- {upvotes, comments, likes, etc.}
    integration_status VARCHAR(50),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_wild_claims_status ON wild_claims(status);
CREATE INDEX IF NOT EXISTS idx_wild_claims_wildness ON wild_claims(wildness_score DESC);
CREATE INDEX IF NOT EXISTS idx_wild_claims_discovered ON wild_claims(discovered_at DESC);
CREATE INDEX IF NOT EXISTS idx_wild_claims_source ON wild_claims(source_type);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_wild_claims_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS wild_claims_updated_at ON wild_claims;
CREATE TRIGGER wild_claims_updated_at
    BEFORE UPDATE ON wild_claims
    FOR EACH ROW
    EXECUTE FUNCTION update_wild_claims_updated_at();

-- ===============================================================================
-- VALIDATIONS TABLE - The Peer Review Records
-- ===============================================================================

CREATE TABLE IF NOT EXISTS wild_claim_validations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Link to claim
    claim_id UUID NOT NULL REFERENCES wild_claims(id) ON DELETE CASCADE,

    -- Validation details
    validation_type VARCHAR(50) NOT NULL,  -- fact_check, code_test, debate, benchmark
    validator_agent VARCHAR(100) NOT NULL,  -- FactChecker, DebateAgent, CodeTester

    -- Results
    score DECIMAL(3,2) NOT NULL,  -- 0-1 scale
    confidence DECIMAL(3,2) NOT NULL,  -- 0-1 scale

    -- Detailed results
    result JSONB DEFAULT '{}'::jsonb,  -- Full validation result
    evidence JSONB DEFAULT '[]'::jsonb,  -- Supporting evidence found
    concerns JSONB DEFAULT '[]'::jsonb,  -- Concerns or red flags

    -- Timestamp
    validated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for retrieving validations by claim
CREATE INDEX IF NOT EXISTS idx_validations_claim ON wild_claim_validations(claim_id);
CREATE INDEX IF NOT EXISTS idx_validations_type ON wild_claim_validations(validation_type);

-- ===============================================================================
-- INTEGRATION PLANS TABLE - The Implementation Blueprints
-- ===============================================================================

CREATE TABLE IF NOT EXISTS wild_claim_integration_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Link to claim
    claim_id UUID NOT NULL REFERENCES wild_claims(id) ON DELETE CASCADE,

    -- Estimates
    effort_estimate DECIMAL(5,1),  -- Estimated days
    impact_estimate DECIMAL(3,2),  -- 0-1 scale
    priority_score DECIMAL(3,2),   -- 0-1 scale

    -- Plan details
    plan_details JSONB DEFAULT '{}'::jsonb,  -- Full plan JSON
    prerequisites JSONB DEFAULT '[]'::jsonb,  -- Required prerequisites
    implementation_steps JSONB DEFAULT '[]'::jsonb,  -- Step-by-step plan
    rollback_plan JSONB DEFAULT '[]'::jsonb,  -- How to rollback
    success_metrics JSONB DEFAULT '[]'::jsonb,  -- Success criteria

    -- Status tracking
    status VARCHAR(50) DEFAULT 'proposed',  -- proposed, approved, in_progress, completed, rejected
    sprint_assigned VARCHAR(50),  -- Sprint 1, Sprint 2, Backlog, etc.

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for plan queries
CREATE INDEX IF NOT EXISTS idx_plans_claim ON wild_claim_integration_plans(claim_id);
CREATE INDEX IF NOT EXISTS idx_plans_priority ON wild_claim_integration_plans(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_plans_status ON wild_claim_integration_plans(status);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS plans_updated_at ON wild_claim_integration_plans;
CREATE TRIGGER plans_updated_at
    BEFORE UPDATE ON wild_claim_integration_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_wild_claims_updated_at();

-- ===============================================================================
-- KNOWLEDGE EDGES TABLE - The Relationship Graph
-- ===============================================================================

CREATE TABLE IF NOT EXISTS wild_claim_knowledge_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Relationship
    source_claim UUID NOT NULL REFERENCES wild_claims(id) ON DELETE CASCADE,
    target_claim UUID NOT NULL REFERENCES wild_claims(id) ON DELETE CASCADE,
    relationship VARCHAR(50) NOT NULL,  -- supports, contradicts, extends, requires

    -- Confidence in this relationship
    confidence DECIMAL(3,2) DEFAULT 0.5,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for graph traversal
CREATE INDEX IF NOT EXISTS idx_edges_source ON wild_claim_knowledge_edges(source_claim);
CREATE INDEX IF NOT EXISTS idx_edges_target ON wild_claim_knowledge_edges(target_claim);
CREATE INDEX IF NOT EXISTS idx_edges_relationship ON wild_claim_knowledge_edges(relationship);

-- ===============================================================================
-- SCAN HISTORY TABLE - The Expedition Log
-- ===============================================================================

CREATE TABLE IF NOT EXISTS wild_claims_scan_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Scan details
    source_type VARCHAR(50) NOT NULL,  -- forums, papers, social, youtube
    source_name VARCHAR(255),  -- r/MachineLearning, arxiv/cs.AI, etc.

    -- Results
    claims_found INTEGER DEFAULT 0,
    new_claims INTEGER DEFAULT 0,

    -- Status
    status VARCHAR(50) DEFAULT 'completed',  -- running, completed, failed
    error_message TEXT,

    -- Timing
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER
);

-- Index for recent scans
CREATE INDEX IF NOT EXISTS idx_scan_history_time ON wild_claims_scan_history(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_history_source ON wild_claims_scan_history(source_type);

-- ===============================================================================
-- DIGESTS TABLE - The Daily Reports
-- ===============================================================================

CREATE TABLE IF NOT EXISTS wild_claims_digests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Digest content
    digest_date DATE NOT NULL,
    title VARCHAR(255),
    content TEXT,  -- Full markdown content

    -- Statistics at time of generation
    stats JSONB DEFAULT '{}'::jsonb,
    top_claims JSONB DEFAULT '[]'::jsonb,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for digest retrieval
CREATE INDEX IF NOT EXISTS idx_digests_date ON wild_claims_digests(digest_date DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_digests_unique_date ON wild_claims_digests(digest_date);

-- ===============================================================================
-- VIEWS - The Lab Reports
-- ===============================================================================

-- View: Top validated claims ready for integration
CREATE OR REPLACE VIEW v_top_validated_claims AS
SELECT
    c.id,
    c.title,
    c.source_type,
    c.source_url,
    c.wildness_score,
    c.validation_score,
    c.claim_type,
    c.discovered_at,
    p.priority_score,
    p.effort_estimate,
    p.impact_estimate
FROM wild_claims c
LEFT JOIN wild_claim_integration_plans p ON c.id = p.claim_id
WHERE c.status = 'validated' OR c.status = 'integrated'
ORDER BY c.wildness_score DESC, c.validation_score DESC
LIMIT 50;

-- View: Claims pending validation
CREATE OR REPLACE VIEW v_pending_validation AS
SELECT
    id,
    title,
    source_type,
    wildness_score,
    discovered_at
FROM wild_claims
WHERE status = 'discovered'
ORDER BY wildness_score DESC, discovered_at DESC;

-- View: Recent scan activity
CREATE OR REPLACE VIEW v_recent_scans AS
SELECT
    source_type,
    MAX(started_at) as last_scan,
    SUM(new_claims) as total_new_claims_24h
FROM wild_claims_scan_history
WHERE started_at > NOW() - INTERVAL '24 hours'
GROUP BY source_type;

-- ===============================================================================
-- ROW LEVEL SECURITY (optional - for multi-tenant support)
-- ===============================================================================

-- Enable RLS on all tables (uncomment if needed)
-- ALTER TABLE wild_claims ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE wild_claim_validations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE wild_claim_integration_plans ENABLE ROW LEVEL SECURITY;

-- ===============================================================================
-- FUNCTIONS - The Lab Procedures
-- ===============================================================================

-- Function: Calculate overall validation score for a claim
CREATE OR REPLACE FUNCTION calculate_claim_validation_score(p_claim_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    avg_score DECIMAL;
BEGIN
    SELECT AVG(score) INTO avg_score
    FROM wild_claim_validations
    WHERE claim_id = p_claim_id;

    RETURN COALESCE(avg_score, 0);
END;
$$ LANGUAGE plpgsql;

-- Function: Get claim with all validations
CREATE OR REPLACE FUNCTION get_claim_with_validations(p_claim_id UUID)
RETURNS TABLE(
    claim JSONB,
    validations JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        to_jsonb(c.*) as claim,
        COALESCE(
            jsonb_agg(to_jsonb(v.*)) FILTER (WHERE v.id IS NOT NULL),
            '[]'::jsonb
        ) as validations
    FROM wild_claims c
    LEFT JOIN wild_claim_validations v ON c.id = v.claim_id
    WHERE c.id = p_claim_id
    GROUP BY c.id, c.source_type, c.source_url, c.title, c.content, c.author,
             c.discovered_at, c.wildness_score, c.claim_type, c.status,
             c.validation_score, c.extracted_claims, c.engagement,
             c.integration_status, c.created_at, c.updated_at;
END;
$$ LANGUAGE plpgsql;

-- Function: Get daily statistics
CREATE OR REPLACE FUNCTION get_daily_stats()
RETURNS TABLE(
    total_claims BIGINT,
    validated_claims BIGINT,
    rejected_claims BIGINT,
    pending_claims BIGINT,
    new_today BIGINT,
    avg_wildness DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) as total_claims,
        COUNT(*) FILTER (WHERE status = 'validated') as validated_claims,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected_claims,
        COUNT(*) FILTER (WHERE status = 'discovered') as pending_claims,
        COUNT(*) FILTER (WHERE discovered_at > CURRENT_DATE) as new_today,
        ROUND(AVG(wildness_score), 2) as avg_wildness
    FROM wild_claims;
END;
$$ LANGUAGE plpgsql;

-- ===============================================================================
-- COMMENTS - Documentation
-- ===============================================================================

COMMENT ON TABLE wild_claims IS 'Wild Claims Czar: Main table storing discovered wild claims from various sources';
COMMENT ON TABLE wild_claim_validations IS 'Wild Claims Czar: Validation results from fact-checking, debate, and code analysis agents';
COMMENT ON TABLE wild_claim_integration_plans IS 'Wild Claims Czar: Implementation plans for validated claims';
COMMENT ON TABLE wild_claim_knowledge_edges IS 'Wild Claims Czar: Knowledge graph edges showing relationships between claims';
COMMENT ON TABLE wild_claims_scan_history IS 'Wild Claims Czar: History of source scanning operations';
COMMENT ON TABLE wild_claims_digests IS 'Wild Claims Czar: Daily digest reports';

-- ===============================================================================
-- SAMPLE DATA (for testing - comment out in production)
-- ===============================================================================

-- Insert a sample claim for testing
-- INSERT INTO wild_claims (title, source_type, source_url, content, author, wildness_score, claim_type, extracted_claims)
-- VALUES (
--     'New prompting technique achieves 40% improvement over Chain of Thought',
--     'reddit',
--     'https://reddit.com/r/MachineLearning/example',
--     'Researchers discovered that structured reasoning prompts with self-verification steps...',
--     'ai_researcher_2026',
--     8.5,
--     'performance',
--     '["40% improvement over CoT", "Works on all model sizes", "No fine-tuning required"]'
-- );

-- ===============================================================================
-- COMPLETE!
-- ===============================================================================
--
-- "THE SPECIMEN VAULT IS READY FOR SCIENCE!"
--
-- Run this SQL in your Supabase SQL Editor to create all tables.
--
-- Tables created:
-- - wild_claims (main specimen collection)
-- - wild_claim_validations (peer review records)
-- - wild_claim_integration_plans (implementation blueprints)
-- - wild_claim_knowledge_edges (relationship graph)
-- - wild_claims_scan_history (expedition log)
-- - wild_claims_digests (daily reports)
--
-- Views created:
-- - v_top_validated_claims
-- - v_pending_validation
-- - v_recent_scans
--
-- Functions created:
-- - calculate_claim_validation_score
-- - get_claim_with_validations
-- - get_daily_stats
--
-- ===============================================================================
