# IndexHub Cloudflare Workers 部署指南

## 功能概述

该系统实现了智能的市场数据收集和查询功能：

### 核心功能

1. **定时数据采集**（每分钟执行）
   - 从新浪财经API获取所有市场数据
   - 智能判断是否需要存储，避免重复记录

2. **智能存储策略**
   - ✅ **数据变化时**：立即更新数据库
   - ⏭️ **60秒内无变化**：跳过更新（减少写入）
   - ⏭️ **收盘后（30分钟无变化）**：停止更新（避免重复记录）
   - 🔄 **5分钟心跳**：即使无变化也更新时间戳（保持数据新鲜度）

3. **查询接口**
   - 返回数据库中的最新数据
   - 如果数据超过60秒，后台触发即时更新
   - 客户端10秒缓存，减少请求压力

## 部署步骤

### 1. 创建 D1 数据库

### 2. 初始化数据库结构

### 3. 部署 Worker

部署成功后会得到一个 URL，例如：
```
https://index-db-proxy.your-subdomain.workers.dev
```

### 4. 测试

#### 测试查询接口

```bash
# 查询单个数据
curl "https://index-db-proxy.your-subdomain.workers.dev/?code=s_sh000001"

# 查询多个数据
curl "https://index-db-proxy.your-subdomain.workers.dev/?code=s_sh000001,gb_ixic,hkHSI"
```

### 5. 更新前端配置

修改 `js/config/constants.js` 中的 API URL：

```javascript
export const DB_API_URL = "https://index-db-proxy.your-subdomain.workers.dev/";
export const USE_DATABASE_API = true;  // 确保这个设置为 true
```

## 数据库字段说明

### market_latest 表

| 字段 | 类型 | 说明 |
|------|------|------|
| code | TEXT | 市场代码（主键） |
| category | TEXT | 市场分类 |
| raw_data | TEXT | 原始数据（新浪API格式） |
| price | REAL | 当前价格 |
| change | REAL | 涨跌额 |
| percent | REAL | 涨跌幅% |
| data_hash | TEXT | 数据哈希（用于检测变化） |
| data_timestamp | TEXT | 数据时间戳 |
| updated_at | TEXT | 最后更新时间 |
| last_change_at | TEXT | 数据最后变化时间 |

## 智能更新逻辑详解

### 规则1：数据有变化 → 立即更新
```
价格/涨跌/涨跌幅任一变化 → 更新数据库并记录变化时间
```

### 规则2：60秒内重复请求 → 跳过
```
避免定时任务频繁写入相同数据
```

### 规则3：收盘检测（30分钟无变化） → 停止更新
```
如果数据持续30分钟不变，认为市场已收盘，停止写入
这样可以避免收盘后每分钟都记录相同的数据
```

### 规则4：心跳更新（5分钟） → 更新时间戳
```
即使数据未变化，每5分钟也更新一次 updated_at
保持数据"活跃"状态，让前端知道数据仍在监控中
```

## 查询接口优化

前端请求时：
1. 立即返回数据库中的最新数据
2. 如果数据超过60秒，后台异步触发更新（不阻塞响应）
3. 如果大部分数据都陈旧（>50%），不触发更新（可能是全局问题）

## 更新和维护

### 添加新市场
在 `data-collector-d1.js` 的 `MARKET_CONFIG` 中添加配置，重新部署即可。

### 调整智能逻辑参数
在 `shouldUpdateData` 函数中修改：
- 60秒：最小更新间隔
- 1800秒（30分钟）：收盘判断阈值
- 300秒（5分钟）：心跳间隔
