// API URL配置
// 开发环境使用直连proxy（快速但每人结果可能不同）
// 生产环境使用数据库API（统一数据源）
export const USE_DATABASE_API = true; // 设置为true使用数据库API

// 直连新浪API的Proxy（原方案）
export const PROXY_URL = "https://sse-index.pkokp8.workers.dev/";

// 数据库API URL（新方案，需要部署hosting/api.php后填写）
export const DB_API_URL = "https://index-hub-collector.pkokp8.workers.dev/";

// 更新间隔（秒）
export const UPDATE_INTERVAL = 30;