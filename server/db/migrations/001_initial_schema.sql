-- =============================================================================
-- RELAY MIGRATION: 001_initial_schema.sql
-- Core Relationships: Customer -> Cases -> Calls -> [Transcripts, Facts, Actions, Approvals, Events]
-- =============================================================================

-- 1. CUSTOMERS
CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(32),
    email VARCHAR(255),
    tier VARCHAR(32) DEFAULT 'STANDARD',
    preferred_language VARCHAR(64) DEFAULT 'Hindi / English',
    dispute_rate NUMERIC(5, 4) DEFAULT 0.0000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. CASES
CREATE TABLE IF NOT EXISTS cases (
    id VARCHAR(64) PRIMARY KEY,
    customer_id VARCHAR(64) REFERENCES customers(id) ON DELETE CASCADE,
    channel_name VARCHAR(128) NOT NULL,
    status VARCHAR(32) DEFAULT 'active' CHECK (status IN ('connecting', 'active', 'awaiting_approval', 'human_takeover', 'resolved', 'failed')),
    language VARCHAR(64) DEFAULT 'Hindi',
    intent VARCHAR(128) DEFAULT 'refund_request',
    sentiment VARCHAR(128) DEFAULT 'Frustrated ➔ Neutral',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- 3. CALLS (WebRTC Sessions)
CREATE TABLE IF NOT EXISTS calls (
    id VARCHAR(64) PRIMARY KEY,
    case_id VARCHAR(64) REFERENCES cases(id) ON DELETE CASCADE,
    rtc_channel VARCHAR(128) NOT NULL,
    audio_sample_rate VARCHAR(32) DEFAULT '48 kHz',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER DEFAULT 0
);

-- 4. PARTICIPANTS
CREATE TABLE IF NOT EXISTS participants (
    id VARCHAR(64) PRIMARY KEY,
    call_id VARCHAR(64) REFERENCES calls(id) ON DELETE CASCADE,
    uid VARCHAR(64) NOT NULL,
    role VARCHAR(32) NOT NULL CHECK (role IN ('CUSTOMER', 'AI_AGENT', 'OPERATOR')),
    name VARCHAR(255) NOT NULL,
    is_muted BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP WITH TIME ZONE
);

-- 5. TRANSCRIPT_MESSAGES
CREATE TABLE IF NOT EXISTS transcript_messages (
    id VARCHAR(64) PRIMARY KEY,
    call_id VARCHAR(64) REFERENCES calls(id) ON DELETE CASCADE,
    speaker VARCHAR(32) NOT NULL CHECK (speaker IN ('CUSTOMER', 'RELAY', 'OPERATOR')),
    text TEXT NOT NULL,
    translation TEXT,
    language VARCHAR(64) DEFAULT 'English',
    is_tool BOOLEAN DEFAULT FALSE,
    tool_name VARCHAR(128),
    confidence NUMERIC(4, 3) DEFAULT 0.950,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. CASE_FACTS
CREATE TABLE IF NOT EXISTS case_facts (
    id VARCHAR(64) PRIMARY KEY,
    case_id VARCHAR(64) REFERENCES cases(id) ON DELETE CASCADE,
    label VARCHAR(255) NOT NULL,
    source VARCHAR(128),
    verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. ACTIONS
CREATE TABLE IF NOT EXISTS actions (
    id VARCHAR(64) PRIMARY KEY,
    case_id VARCHAR(64) REFERENCES cases(id) ON DELETE CASCADE,
    type VARCHAR(64) NOT NULL CHECK (type IN ('REFUND', 'ESCALATION', 'REROUTE', 'COURIER_HOLD')),
    title VARCHAR(255) NOT NULL,
    amount NUMERIC(10, 2),
    currency VARCHAR(8) DEFAULT 'INR',
    status VARCHAR(32) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'DECLINED', 'EXECUTED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. APPROVALS
CREATE TABLE IF NOT EXISTS approvals (
    id VARCHAR(64) PRIMARY KEY,
    action_id VARCHAR(64) REFERENCES actions(id) ON DELETE CASCADE,
    case_id VARCHAR(64) REFERENCES cases(id) ON DELETE CASCADE,
    risk_tier VARCHAR(32) DEFAULT 'MEDIUM' CHECK (risk_tier IN ('LOW', 'MEDIUM', 'HIGH')),
    policy_id VARCHAR(128) NOT NULL,
    status VARCHAR(32) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'DECLINED', 'EXPIRED')),
    operator_id VARCHAR(64),
    operator_name VARCHAR(255),
    decline_reason TEXT,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. TOOL_EXECUTIONS
CREATE TABLE IF NOT EXISTS tool_executions (
    id VARCHAR(64) PRIMARY KEY,
    case_id VARCHAR(64) REFERENCES cases(id) ON DELETE CASCADE,
    tool_name VARCHAR(128) NOT NULL,
    parameters JSONB DEFAULT '{}'::jsonb,
    result JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(32) DEFAULT 'SUCCESS',
    duration_ms INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. RELAY_EVENTS (IMMUTABLE APPEND-ONLY EVENT LEDGER)
CREATE TABLE IF NOT EXISTS relay_events (
    id VARCHAR(64) PRIMARY KEY,
    case_id VARCHAR(64) REFERENCES cases(id) ON DELETE CASCADE,
    sequence_num BIGINT NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL,
    timestamp VARCHAR(32) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_case_sequence UNIQUE (case_id, sequence_num)
);

CREATE OR REPLACE RULE no_update_relay_events AS ON UPDATE TO relay_events DO INSTEAD NOTHING;
CREATE OR REPLACE RULE no_delete_relay_events AS ON DELETE TO relay_events DO INSTEAD NOTHING;

CREATE INDEX IF NOT EXISTS idx_cases_customer_id ON cases(customer_id);
CREATE INDEX IF NOT EXISTS idx_calls_case_id ON calls(case_id);
CREATE INDEX IF NOT EXISTS idx_participants_call_id ON participants(call_id);
CREATE INDEX IF NOT EXISTS idx_transcript_call_id ON transcript_messages(call_id);
CREATE INDEX IF NOT EXISTS idx_case_facts_case_id ON case_facts(case_id);
CREATE INDEX IF NOT EXISTS idx_approvals_case_id ON approvals(case_id);
CREATE INDEX IF NOT EXISTS idx_tool_executions_case_id ON tool_executions(case_id);
CREATE INDEX IF NOT EXISTS idx_relay_events_case_seq ON relay_events(case_id, sequence_num ASC);
