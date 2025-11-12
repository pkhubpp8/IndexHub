import { INDEX_LIST } from './config/marketConfig.js';
import { UPDATE_INTERVAL } from './config/constants.js';
import { marketService } from './services/marketService.js';
import { gridManager } from './utils/gridUtils.js';
import { formatTime } from './utils/dateUtils.js';
import { Card } from './ui/Card.js';
import { themeManager } from './ui/theme.js';
import { ModalManager } from './ui/Modal.js';

class App {
  constructor() {
    this.lastUpdateEl = document.getElementById('lastUpdate');
    this.refreshBtn = document.getElementById('refreshBtn');
    this.countdownEl = document.getElementById('countdown');
    this.cards = new Map();
    this.isRefreshing = false;
    this.countdown = UPDATE_INTERVAL;
    this.modalManager = new ModalManager();  // 初始化模态窗口管理器

    this.initialize();
  }

  initialize() {
    this.createCards();
    this.setupEventListeners();
    this.startCountdown();
    this.refresh();
  }

  createCards() {
    // 对每个分类的数据进行分组
    const groupedItems = INDEX_LIST.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {});

    // 为每个分类创建卡片，限制显示数量
    Object.entries(groupedItems).forEach(([category, items]) => {
      const displayItems = category === 'metal' ? items.slice(0, 6) : items;
      displayItems.forEach(item => {
        const card = new Card(item);
        gridManager.grids[category].appendChild(card.element);
        this.cards.set(item.code, card);
      });
    });

    // 创建完整的金属卡片（用于弹窗）
    if (groupedItems.metal?.length > 6) {
      const metalGrid = document.getElementById('metalGridFull');
      if (metalGrid) {
        groupedItems.metal.forEach(item => {
          const card = new Card(item);
          metalGrid.appendChild(card.element);
          this.cards.set(item.code + '_full', card);
        });
      }
    }

    gridManager.updatePlaceholders();
  }

  setupEventListeners() {
    this.refreshBtn.addEventListener('click', () => {
      this.countdown = UPDATE_INTERVAL;
      this.refresh();
    });
    
    // 监听颜色模式切换事件
    window.addEventListener('colorModeChanged', () => {
      this.updateColorIndicators();
    });
  }

  updateColorIndicators() {
    // 更新所有卡片的颜色模式指示器
    for (const [code, card] of this.cards) {
      card.updateColorIndicators();
    }
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

    // 更新所有卡片，包括主视图和弹窗中的卡片
    for (const [code, card] of this.cards) {
      // 处理完整视图中的卡片（去除_full后缀）
      const baseCode = code.endsWith('_full') ? code.replace('_full', '') : code;
      const rawData = data[baseCode];

      try {
        // 找到对应的配置项以获取category
        const config = INDEX_LIST.find(item => item.code === baseCode);
        if (config && rawData) {
          const parsedData = marketService.parseIndexData(rawData, config.category);
          card.update(parsedData);
        } else {
          card.setError();
        }
      } catch (error) {
        console.error(`Failed to update card ${code}:`, error);
        card.setError();
      }
    }
  }
}

// 启动应用
const app = new App();