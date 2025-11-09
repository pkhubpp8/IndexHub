import { INDEX_LIST } from './config/marketConfig.js';
import { UPDATE_INTERVAL } from './config/constants.js';
import { marketService } from './services/marketService.js';
import { gridManager } from './utils/gridUtils.js';
import { formatTime } from './utils/dateUtils.js';
import { Card } from './ui/Card.js';
import { themeManager } from './ui/theme.js';

class App {
  constructor() {
    this.lastUpdateEl = document.getElementById('lastUpdate');
    this.refreshBtn = document.getElementById('refreshBtn');
    this.countdownEl = document.getElementById('countdown');
    this.cards = new Map();
    this.isRefreshing = false;
    this.countdown = UPDATE_INTERVAL;

    this.initialize();
  }

  initialize() {
    this.createCards();
    this.setupEventListeners();
    this.startCountdown();
    this.refresh();
  }

  createCards() {
    INDEX_LIST.forEach(item => {
      const card = new Card(item);
      gridManager.grids[item.category].appendChild(card.element);
      this.cards.set(item.code, card);
    });
    gridManager.updatePlaceholders();
  }

  setupEventListeners() {
    this.refreshBtn.addEventListener('click', () => {
      this.countdown = UPDATE_INTERVAL;
      this.refresh();
    });
  }

  startCountdown() {
    setInterval(() => {
      this.countdownEl.textContent = `${this.countdown} 秒后自动刷新`;
      this.countdown--;
      if (this.countdown < 0) {
        this.countdown = UPDATE_INTERVAL;
        this.refresh();
      }
    }, 1000);
  }

  async refresh() {
    if (this.isRefreshing) return;

    this.isRefreshing = true;
    this.updateRefreshButton(true);

    try {
      const codes = INDEX_LIST.map(item => item.code);
      const data = await marketService.fetchMarketData(codes);
      this.updateUI(data);
    } catch (error) {
      console.error('Failed to refresh data:', error);
    } finally {
      this.isRefreshing = false;
      this.updateRefreshButton(false);
    }
  }

  updateRefreshButton(isLoading) {
    this.refreshBtn.disabled = isLoading;
    this.refreshBtn.style.opacity = isLoading ? '0.6' : '1';
    this.refreshBtn.textContent = isLoading ? '加载中...' : '🔁 立即刷新';
  }

  updateUI(data) {
    this.lastUpdateEl.textContent = `更新时间：${formatTime(new Date())}`;

    INDEX_LIST.forEach(item => {
      const card = this.cards.get(item.code);
      const rawData = data[item.code];
      if (card) {
        try {
          const parsedData = marketService.parseIndexData(rawData, item.category);
          card.update(parsedData);
        } catch (error) {
          console.error(`Failed to update ${item.name}:`, error);
          card.setError();
        }
      }
    });
  }
}

// 启动应用
const app = new App();