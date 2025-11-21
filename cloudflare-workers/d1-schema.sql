-- IndexHub D1 Database Schema
-- 使用Cloudflare D1 (SQLite)

-- 最新数据表
CREATE TABLE IF NOT EXISTS market_latest (
    code TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    format_group TEXT NOT NULL,  -- 数据格式分组: cn_index, us_index, hk_index, metal, fx, crypto等
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
CREATE INDEX IF NOT EXISTS idx_format_group ON market_latest(format_group);
CREATE INDEX IF NOT EXISTS idx_category ON market_latest(category);
CREATE INDEX IF NOT EXISTS idx_updated ON market_latest(updated_at);

-- 历史数据表 - 按format_group聚合存储，减少行数
CREATE TABLE IF NOT EXISTS market_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    format_group TEXT NOT NULL,     -- 格式分组
    codes TEXT NOT NULL,            -- 逗号分隔的code列表
    prices TEXT NOT NULL,           -- 逗号分隔的价格列表
    changes TEXT NOT NULL,          -- 逗号分隔的涨跌额列表
    percents TEXT NOT NULL,         -- 逗号分隔的涨跌幅列表
    data_timestamp TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_history_group_timestamp ON market_history(format_group, data_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_history_timestamp ON market_history(data_timestamp);

-- 迁移说明：
-- 1. 添加format_group字段到market_latest: ALTER TABLE market_latest ADD COLUMN format_group TEXT DEFAULT 'default';
-- 2. 更新format_group值（见worker代码中的getFormatGroup函数）
-- 3. 创建新的聚合历史表，旧数据可选择性迁移或清空
