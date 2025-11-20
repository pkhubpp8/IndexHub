import { PROXY_URL, DB_API_URL, USE_DATABASE_API } from '../config/constants.js';

class MarketService {
  async fetchMarketData(codes) {
    try {
      // 根据配置选择使用哪个API
      const apiUrl = USE_DATABASE_API ? DB_API_URL : PROXY_URL;
      const res = await fetch(`${apiUrl}?code=${codes.join(',')}`);
      const text = await res.text();
      return this.parseResponse(text);
    } catch (error) {
      console.error('Failed to fetch market data:', error);
      throw error;
    }
  }

  async fetchHistoryData(code, days = 1) {
    try {
      const apiUrl = USE_DATABASE_API ? DB_API_URL : PROXY_URL;
      // 确保URL不以斜杠结尾，避免双斜杠问题
      const baseUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
      const res = await fetch(`${baseUrl}/api/history?code=${code}&days=${days}&limit=2000`);
      const json = await res.json();

      if (json.error) {
        throw new Error(json.error);
      }

      return json.data || [];
    } catch (error) {
      console.error('Failed to fetch history data:', error);
      throw error;
    }
  }

  // 数据抽样函数，减少数据点数量以优化显示
  sampleData(data, maxPoints = 100) {
    if (!data || data.length <= maxPoints) {
      return data;
    }

    const sampledData = [];
    const step = data.length / maxPoints;

    for (let i = 0; i < maxPoints; i++) {
      const index = Math.floor(i * step);
      if (index < data.length) {
        sampledData.push(data[index]);
      }
    }

    // 确保包含最后一个数据点
    if (sampledData[sampledData.length - 1] !== data[data.length - 1]) {
      sampledData.push(data[data.length - 1]);
    }

    return sampledData;
  }

  // 处理历史数据，转换为图表所需格式
  processHistoryData(data, days) {
    if (!data || data.length === 0) {
      return [];
    }

    // 数据按时间倒序，需要反转
    const sortedData = [...data].reverse();

    // 转换为图表格式
    const chartData = sortedData.map(item => ({
      timestamp: item.data_timestamp,
      price: item.price,
      change: item.change,
      percent: item.percent
    }));

    // 根据天数决定抽样程度
    let maxPoints;
    if (days === 1) {
      maxPoints = 100; // 1天显示更多细节
    } else if (days === 5) {
      maxPoints = 80;  // 5天适度抽样
    } else {
      maxPoints = 60;  // 30天较少点
    }

    return this.sampleData(chartData, maxPoints);
  }

  parseResponse(text) {
    const result = {};
    const lines = text.split("\n").filter(x => x.includes("hq_str_"));
    for (const line of lines) {
      const m = line.match(/var\s+hq_str_([^=]+)\s*=\s*"([^"]*)"/);
      if (m) result[m[1]] = m[2].split(",");
    }
    return result;
  }

  parseIndexData(p, category) {
    if (!p) return { price: 0, change: 0, percent: 0 };
    let price = 0, change = 0, percent = 0;

    switch (category) {
      case "us":
        price = parseFloat(p[1]) || 0;       // 当前指数
        change = parseFloat(p[4]) || 0;      // 涨跌额
        percent = parseFloat(p[2]) || 0;     // 涨跌百分比
        break;
      case "hk":
        price = parseFloat(p[2]) || 0;
        change = parseFloat(p[7]) || 0;
        percent = parseFloat(p[8]) || 0;
        break;
      case "metal":
      case "energy":
        // 处理期货数据格式（nf_前缀）
        if (p[0] && p[0].includes('连续')) {
          price = parseFloat(p[7]) || 0;      // 最新价
          const prev = parseFloat(p[2]) || 0;  // 昨结算
          change = price - prev;
          percent = prev ? (change / prev) * 100 : 0;
        }
        // 处理现货数据格式（hf_前缀）
        else {
          price = parseFloat(p[0]) || 0;
          const prev = parseFloat(p[7]) || 0;
          change = price - prev;
          percent = prev ? (change / prev) * 100 : 0;
        }
        break;
      case "fx":
        price = parseFloat(p[1]) || 0;
        const prevFX = parseFloat(p[5]) || 0;
        change = price - prevFX;
        percent = prevFX ? (change / prevFX) * 100 : 0;
        break;
      case "crypto":
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
  }
}

export const marketService = new MarketService();