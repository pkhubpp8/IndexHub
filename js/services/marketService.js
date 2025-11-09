import { PROXY_URL } from '../config/constants.js';

class MarketService {
  async fetchMarketData(codes) {
    try {
      const res = await fetch(`${PROXY_URL}?code=${codes.join(',')}`);
      const text = await res.text();
      return this.parseResponse(text);
    } catch (error) {
      console.error('Failed to fetch market data:', error);
      throw error;
    }
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