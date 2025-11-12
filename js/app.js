import { INDEX_LIST } from './config/marketConfig.js';
import { UPDATE_INTERVAL } from './config/constants.js';
import { marketService } from './services/marketService.js';
import { gridManager } from './utils/gridUtils.js';
import { formatTime } from './utils/dateUtils.js';
import { Card } from './ui/Card.js';
import { themeManager } from './ui/theme.js';
// ModalManager在Modal.js中自动初始化，不需要在这里导入

class App {
  constructor() {
    this.lastUpdateEl = document.getElementById('lastUpdate');
    this.refreshBtn = document.getElementById('refreshBtn');
    this.countdownEl = document.getElementById('countdown');
    this.cards = new Map();
    this.isRefreshing = false;
    this.countdown = UPDATE_INTERVAL;
    // ModalManager已在Modal.js模块加载时初始化，这里不需要创建新实例

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

    // 为每个分类创建卡片，限制显示数量（最多6个）
    Object.entries(groupedItems).forEach(([category, items]) => {
      const grid = gridManager.grids[category];
      if (!grid) {
        console.warn(`Grid not found for category: ${category}`);
        return;
      }
      
      const displayItems = items.slice(0, 6);
      displayItems.forEach(item => {
        const card = new Card(item);
        grid.appendChild(card.element);
        this.cards.set(item.code, card);
      });
      
      // 如果项目数大于6，显示"查看更多"按钮并创建完整视图卡片
      if (items.length > 6) {
        const moreBtn = document.getElementById(`${category}MoreBtn`);
        if (moreBtn) {
          moreBtn.style.display = 'block';
        }
        
        // 创建完整的卡片（用于弹窗）
        // 由于弹窗可能还没创建，使用延迟重试机制
        let retryCount = 0;
        const maxRetries = 10; // 最多重试10次（1秒）
        const createFullCards = () => {
          const fullGrid = document.getElementById(`${category}GridFull`);
          if (fullGrid) {
            items.forEach(item => {
              const card = new Card(item);
              fullGrid.appendChild(card.element);
              this.cards.set(item.code + '_full', card);
            });
            
            // 根据项目数量优化弹窗布局
            this.optimizeModalGridLayout(fullGrid, items.length);
          } else if (retryCount < maxRetries) {
            // 如果弹窗还没创建，延迟重试
            retryCount++;
            setTimeout(createFullCards, 100);
          } else {
            console.warn(`Failed to create full cards for ${category}: grid not found after ${maxRetries} retries`);
          }
        };
        createFullCards();
      }
    });

    gridManager.updatePlaceholders();
  }

  // 根据项目数量优化弹窗网格布局
  optimizeModalGridLayout(grid, itemCount) {
    let columns;
    
    // 根据项目数量智能选择列数
    if (itemCount <= 4) {
      columns = itemCount; // 1-4个项目：使用对应列数
    } else if (itemCount === 5) {
      columns = 3; // 5个项目：3列（2行，最后一行2个）
    } else if (itemCount === 6) {
      columns = 3; // 6个项目：3列（2行）
    } else if (itemCount === 7) {
      columns = 4; // 7个项目：4列（2行，最后一行3个）
    } else if (itemCount === 8) {
      columns = 4; // 8个项目：4列（2行）
    } else if (itemCount === 9) {
      columns = 3; // 9个项目：3列（3行）
    } else {
      columns = 4; // 10个以上：4列
    }
    
    grid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
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