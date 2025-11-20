-- IndexHub D1 Database Schema
-- 使用Cloudflare D1 (SQLite)

-- 最新数据表
CREATE TABLE IF NOT EXISTS market_latest (
    code TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    raw_data TEXT NOT NULL,
    price REAL DEFAULT 0,
    change REAL DEFAULT 0,
    percent REAL DEFAULT 0,
    data_hash TEXT NOT NULL,
    data_timestamp TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_change_at TEXT NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_category ON market_latest(category);
CREATE INDEX IF NOT EXISTS idx_updated ON market_latest(updated_at);
CREATE INDEX IF NOT EXISTS idx_timestamp ON market_latest(data_timestamp);

-- 历史数据表（可选，用于数据分析）
CREATE TABLE IF NOT EXISTS market_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL,
    category TEXT NOT NULL,
    raw_data TEXT NOT NULL,
    price REAL DEFAULT 0,
    change REAL DEFAULT 0,
    percent REAL DEFAULT 0,
    data_timestamp TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_history_code ON market_history(code);
CREATE INDEX IF NOT EXISTS idx_history_timestamp ON market_history(data_timestamp);
