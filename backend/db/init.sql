
-- Users Table (Who created the links)

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,                          -- Auto-incrementing integer (1, 2, 3...)
    email VARCHAR(255) UNIQUE NOT NULL,            
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);


-- URLs Table (The Shortening Engine)


CREATE TABLE IF NOT EXISTS urls (
    id BIGSERIAL PRIMARY KEY,                       -- 64-bit integer ID used for Base62 encoding
    short_code VARCHAR(16) UNIQUE NOT NULL,         -- e.g. "gh2026" or "aB9xYz"
    original_url TEXT NOT NULL,                   
    custom_alias VARCHAR(32) UNIQUE,                -- Optional custom name 
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- Link to users table
    clicks_count BIGINT NOT NULL DEFAULT 0,         -- Fast counter for summary cards
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);


-- Clicks Table (Real-Time Telemetry Stream)

CREATE TABLE IF NOT EXISTS clicks (
    id BIGSERIAL PRIMARY KEY,
    url_id BIGINT NOT NULL REFERENCES urls(id) ON DELETE CASCADE, -- Link to urls table
    clicked_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_hash VARCHAR(64),                            -- SHA-256 hash of IP (GDPR Privacy Safe)
    country VARCHAR(64) DEFAULT 'Unknown',          -- e.g. "India", "United States"
    city VARCHAR(100) DEFAULT 'Unknown',            -- e.g. "Bengaluru", "New York"
    device_type VARCHAR(32) DEFAULT 'Desktop',      -- "Desktop", "Mobile", "Tablet"
    browser VARCHAR(64) DEFAULT 'Unknown',          -- "Chrome", "Safari", "Firefox"
    os VARCHAR(64) DEFAULT 'Unknown',               -- "Windows", "macOS", "iOS", "Android"
    referrer VARCHAR(255) DEFAULT 'Direct'          -- "linkedin.com", "t.co", "Direct"
);



-- B-Tree Indexes for High Performance

-- Fast lookup by short_code when redirecting:

CREATE INDEX IF NOT EXISTS idx_urls_short_code ON urls(short_code);

-- Fast lookup for analytics charts (fetches all clicks for a URL ordered by date):

CREATE INDEX IF NOT EXISTS idx_clicks_url_id_clicked_at ON clicks(url_id, clicked_at DESC);

-- Fast aggregation for Country & Device charts:

CREATE INDEX IF NOT EXISTS idx_clicks_url_country ON clicks(url_id, country);
CREATE INDEX IF NOT EXISTS idx_clicks_url_device ON clicks(url_id, device_type);


--Sample Seed Data (For testing right away!)


INSERT INTO users (email, name)
VALUES ('demo@pulselink.dev', 'Demo Engineer')
ON CONFLICT (email) DO NOTHING;

INSERT INTO urls (short_code, original_url, user_id, clicks_count)
VALUES ('gh2026', 'https://github.com', 1, 1)
ON CONFLICT (short_code) DO NOTHING;

INSERT INTO clicks (url_id, country, city, device_type, browser, os, referrer)
SELECT id, 'India', 'Bengaluru', 'Desktop', 'Chrome', 'Windows', 'linkedin.com'
FROM urls WHERE short_code = 'gh2026'
  AND NOT EXISTS (SELECT 1 FROM clicks WHERE url_id = (SELECT id FROM urls WHERE short_code = 'gh2026'));