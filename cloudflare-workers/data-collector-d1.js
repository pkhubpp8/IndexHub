/**
 * IndexHub Data Collector Worker - D1 Version
 */

// 市场配置
const MARKET_CONFIG = {
  's_sh000001': { category: 'cn', name: '上证指数' },
  's_sz399001': { category: 'cn', name: '深证成指' },
  's_sh000300': { category: 'cn', name: '沪深300' },
  's_bj899050': { category: 'cn', name: '北证50' },
  's_sz399006': { category: 'cn', name: '创业板指' },
  's_sh000688': { category: 'cn', name: '科创50' },
  's_sh000002': { category: 'cn', name: 'Ａ股指数' },
  's_sh000003': { category: 'cn', name: 'Ｂ股指数' },
  'gb_ixic': { category: 'us', name: '纳斯达克' },
  'gb_$dji': { category: 'us', name: '道琼斯' },
  'gb_$inx': { category: 'us', name: '标普500' },
  'znb_NKY': { category: 'asia', name: '日经225' },
  'znb_KOSPI': { category: 'asia', name: '首尔综合' },
  'znb_TWJQ': { category: 'asia', name: '台湾加权' },
  'hkHSI': { category: 'hk', name: '恒生指数' },
  'hkHSTECH': { category: 'hk', name: '恒生科技' },
  'hkHSCEI': { category: 'hk', name: '国企指数' },
  'b_UKX': { category: 'eu', name: '富时100' },
  'b_DAX': { category: 'eu', name: '德国DAX' },
  'b_CAC': { category: 'eu', name: '法国CAC40' },
  'b_FTSEMIB': { category: 'eu', name: '意大利MIB' },
  'hf_XAU': { category: 'metal', name: '伦敦金' },
  'hf_XAG': { category: 'metal', name: '伦敦银' },
  'hf_GC': { category: 'metal', name: '纽约黄金' },
  'hf_SI': { category: 'metal', name: '纽约白银' },
  'hf_CAD': { category: 'metal', name: '伦铜' },
  'hf_HG': { category: 'metal', name: '美铜' },
  'nf_AU0': { category: 'metal', name: '黄金连续' },
  'hf_CL': { category: 'energy', name: '纽约原油' },
  'hf_OIL': { category: 'energy', name: '布伦特原油' },
  'DINIW': { category: 'fx', name: '美元指数' },
  'USDCNY': { category: 'fx', name: '美元人民币' },
  'EURCNY': { category: 'fx', name: '欧元人民币' },
  'CNYJPY': { category: 'fx', name: '人民币日元' },
  'EURUSD': { category: 'fx', name: '欧元美元' },
  'USDJPY': { category: 'fx', name: '美元日元' },
  'GBPUSD': { category: 'fx', name: '英镑美元' },
  'btc_btcbtcusd': { category: 'crypto', name: '比特币' },
  'btc_btcethusd': { category: 'crypto', name: '以太坊' },
  'btc_btcsolusd': { category: 'crypto', name: '索拉纳' },
  'btc_btcbnbusd': { category: 'crypto', name: '币安币' },
  'btc_btcxrpusd': { category: 'crypto', name: '瑞波币' }
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // API查询接口 - 兼容原来的格式
    if (url.pathname === '/' || url.pathname === '/api') {
      const code = url.searchParams.get('code');
      if (!code) {
        return new Response('Missing code parameter', { status: 400 });
      }

      const codes = code.split(',');
      const results = await this.queryMarketData(env.DB, codes);

      // 检查数据新鲜度，如果超过60秒则触发即时更新
      const now = new Date();
      const staleData = results.filter(item => {
        const updatedAt = new Date(item.updated_at + 'Z');
        return (now - updatedAt) / 1000 > 60;
      });

      // 如果有陈旧数据且少于结果总数的50%，尝试即时更新这些数据
      if (staleData.length > 0 && staleData.length < results.length * 0.5) {
        const staleCodes = staleData.map(item => item.code);
        ctx.waitUntil(this.updateSpecificCodes(env.DB, staleCodes));
      }

      // 返回新浪格式（返回数据库中现有的最新数据，无论是否在60秒内）
      const output = results.map(item =>
        `var hq_str_${item.code}="${item.raw_data}";`
      ).join('\n');

      return new Response(output + '\n', {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=10' // 客户端缓存10秒
        }
      });
    }

    return new Response('IndexHub Data Collector with D1. Check scheduled task.', {
      headers: { 'Content-Type': 'text/plain' }
    });
  },

  async scheduled(event, env, ctx) {
    console.log('Starting scheduled data collection...');

    try {
      // 1. 从新浪API获取数据
      const codes = Object.keys(MARKET_CONFIG);
      const data = await this.fetchMarketData(codes);

      // 2. 解析数据
      const parsedData = this.parseMarketData(data);
      console.log(`Parsed ${parsedData.length} items`);

      // 3. 保存到D1数据库
      const result = await this.saveToD1(env.DB, parsedData);
      console.log(`Saved to D1: ${result.updated} updated, ${result.skipped} skipped`);

      console.log(`Data collection completed. Processed ${parsedData.length} items.`);
    } catch (error) {
      console.error('Error in scheduled task:', error);
    }
  },

  async fetchMarketData(codes) {
    const codeString = codes.join(',');
    const url = `https://hq.sinajs.cn/list=${codeString}`;

    const res = await fetch(url, {
      headers: {
        'Referer': 'https://finance.sina.com.cn/',
        'User-Agent': 'Mozilla/5.0'
      }
    });

    const buffer = await res.arrayBuffer();
    const decoder = new TextDecoder('gb2312');
    return decoder.decode(buffer);
  },

  parseMarketData(text) {
    const result = [];
    const lines = text.split('\n').filter(x => x.includes('hq_str_'));

    for (const line of lines) {
      const match = line.match(/var\s+hq_str_([^=]+)\s*=\s*"([^"]*)"/);
      if (match) {
        const code = match[1];
        const rawData = match[2];
        const config = MARKET_CONFIG[code];

        if (config && rawData) {
          const parsed = this.parseIndexData(rawData.split(','), config.category);
          result.push({
            code,
            category: config.category,
            name: config.name,
            rawData,
            ...parsed
          });
        }
      }
    }

    return result;
  },

  parseIndexData(p, category) {
    if (!p || p.length === 0) return { price: 0, change: 0, percent: 0 };

    let price = 0, change = 0, percent = 0;

    switch (category) {
      case 'us':
        price = parseFloat(p[1]) || 0;
        change = parseFloat(p[4]) || 0;
        percent = parseFloat(p[2]) || 0;
        break;
      case 'hk':
        price = parseFloat(p[2]) || 0;
        change = parseFloat(p[7]) || 0;
        percent = parseFloat(p[8]) || 0;
        break;
      case 'metal':
      case 'energy':
        if (p[0] && p[0].includes('连续')) {
          price = parseFloat(p[7]) || 0;
          const prev = parseFloat(p[2]) || 0;
          change = price - prev;
          percent = prev ? (change / prev) * 100 : 0;
        } else {
          price = parseFloat(p[0]) || 0;
          const prev = parseFloat(p[7]) || 0;
          change = price - prev;
          percent = prev ? (change / prev) * 100 : 0;
        }
        break;
      case 'fx':
        price = parseFloat(p[1]) || 0;
        const prevFX = parseFloat(p[5]) || 0;
        change = price - prevFX;
        percent = prevFX ? (change / prevFX) * 100 : 0;
        break;
      case 'crypto':
        price = parseFloat(p[8]) || 0;
        const open = parseFloat(p[5]) || price;
        change = price - open;
        percent = open ? (change / open) * 100 : 0;
        break;
      default:
        price = parseFloat(p[1]) || 0;
        change = parseFloat(p[2]) || 0;
        percent = parseFloat(p[3]) || 0;
    }

    return { price, change, percent };
  },

  async saveToD1(db, dataArray) {
    let updatedCount = 0;
    let skippedCount = 0;

    for (const item of dataArray) {
      try {
        // 计算数据哈希（用于检测数据是否真正变化）
        const dataHash = this.hashData(item.price, item.change, item.percent);

        // 检查是否需要更新
        const updateDecision = await this.shouldUpdateData(db, item, dataHash);

        if (updateDecision.shouldUpdate) {
          const now = new Date().toISOString();
          // 如果数据变化或首次插入（lastChangeAt为null），使用当前时间
          const lastChangeAt = updateDecision.dataChanged ? now : (updateDecision.lastChangeAt || now);

          // 使用REPLACE INTO（SQLite语法，相当于INSERT OR REPLACE）
          await db.prepare(`
            INSERT OR REPLACE INTO market_latest
            (code, category, raw_data, price, change, percent, data_hash, data_timestamp, updated_at, last_change_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            item.code,
            item.category,
            item.rawData,
            item.price,
            item.change,
            item.percent,
            dataHash,
            now,
            now,
            lastChangeAt
          ).run();

          updatedCount++;
        } else {
          skippedCount++;
        }
      } catch (error) {
        console.error(`Error saving ${item.code}:`, error);
      }
    }

    return { updated: updatedCount, skipped: skippedCount };
  },

  // 计算数据哈希
  hashData(price, change, percent) {
    const str = `${price.toFixed(4)}_${change.toFixed(4)}_${percent.toFixed(4)}`;
    // 简单哈希函数
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  },

  async shouldUpdateData(db, item, dataHash) {
    try {
      const result = await db.prepare(
        'SELECT data_hash, updated_at, last_change_at FROM market_latest WHERE code = ?'
      ).bind(item.code).first();

      if (!result) {
        // 没有记录，需要插入
        return { shouldUpdate: true, dataChanged: true, lastChangeAt: null };
      }

      const now = new Date();
      const lastUpdate = new Date(result.updated_at + 'Z');
      const lastChange = new Date(result.last_change_at + 'Z');
      const timeSinceUpdate = (now - lastUpdate) / 1000;
      const timeSinceChange = (now - lastChange) / 1000;

      // 检查数据哈希是否变化
      const dataChanged = result.data_hash !== dataHash;

      // 规则1: 数据有变化，立即更新
      if (dataChanged) {
        return { shouldUpdate: true, dataChanged: true, lastChangeAt: result.last_change_at };
      }

      // 规则2: 数据未变化但距离上次更新不到60秒，跳过（避免频繁写入）
      if (timeSinceUpdate < 60) {
        return { shouldUpdate: false, dataChanged: false, lastChangeAt: result.last_change_at };
      }

      // 规则3: 数据未变化超过30分钟，认为已收盘，跳过（避免收盘后重复记录）
      if (timeSinceChange > 1800) {
        return { shouldUpdate: false, dataChanged: false, lastChangeAt: result.last_change_at };
      }

      // 规则4: 数据未变化但距离上次更新超过5分钟，进行心跳更新（保持数据新鲜度）
      if (timeSinceUpdate >= 300) {
        return { shouldUpdate: true, dataChanged: false, lastChangeAt: result.last_change_at };
      }

      return { shouldUpdate: false, dataChanged: false, lastChangeAt: result.last_change_at };
    } catch (error) {
      console.error('Error in shouldUpdateData:', error);
      // 出错时默认更新
      return { shouldUpdate: true, dataChanged: true, lastChangeAt: null };
    }
  },

  async queryMarketData(db, codes) {
    try {
      const placeholders = codes.map(() => '?').join(',');
      const results = await db.prepare(
        `SELECT code, raw_data, updated_at FROM market_latest WHERE code IN (${placeholders})`
      ).bind(...codes).all();

      return results.results || [];
    } catch (error) {
      console.error('Error querying data:', error);
      return [];
    }
  },

  // 即时更新特定代码的数据（用于查询时发现数据陈旧的情况）
  async updateSpecificCodes(db, codes) {
    try {
      console.log(`Updating stale data for codes: ${codes.join(', ')}`);
      const data = await this.fetchMarketData(codes);
      const parsedData = this.parseMarketData(data);
      await this.saveToD1(db, parsedData);
      console.log(`Stale data updated for ${parsedData.length} items`);
    } catch (error) {
      console.error('Error updating stale data:', error);
    }
  }
};
