import { Chart } from './Chart.js';
import { marketService } from '../services/marketService.js';

export class ChartModal {
  constructor() {
    this.modal = null;
    this.chart = null;
    this.currentCode = null;
    this.currentName = null;
    this.currentDays = 1;
    this.isLoading = false;
    this.createModal();
  }

  createModal() {
    // 创建弹窗容器
    this.modal = document.createElement('div');
    this.modal.className = 'chart-modal';
    this.modal.style.display = 'none';

    const content = document.createElement('div');
    content.className = 'chart-modal-content';

    // 头部
    const header = document.createElement('div');
    header.className = 'chart-modal-header';

    const title = document.createElement('h3');
    title.className = 'chart-modal-title';
    title.textContent = '价格走势';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'chart-modal-close';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => this.close());

    header.appendChild(title);
    header.appendChild(closeBtn);

    // 时间范围选择器
    const timeRange = document.createElement('div');
    timeRange.className = 'chart-time-range';

    const ranges = [
      { days: 1, label: '1天' },
      { days: 5, label: '5天' },
      { days: 30, label: '30天' }
    ];

    ranges.forEach(range => {
      const btn = document.createElement('button');
      btn.className = 'chart-time-btn';
      btn.textContent = range.label;
      btn.dataset.days = range.days;
      if (range.days === 1) {
        btn.classList.add('active');
      }
      btn.addEventListener('click', () => this.changeTimeRange(range.days));
      timeRange.appendChild(btn);
    });

    // 图表容器
    const chartContainer = document.createElement('div');
    chartContainer.className = 'chart-container';

    const canvas = document.createElement('canvas');
    canvas.className = 'chart-canvas';
    chartContainer.appendChild(canvas);

    // 加载提示
    const loadingEl = document.createElement('div');
    loadingEl.className = 'chart-loading';
    loadingEl.textContent = '加载中...';
    loadingEl.style.display = 'none';
    chartContainer.appendChild(loadingEl);

    // 组装
    content.appendChild(header);
    content.appendChild(timeRange);
    content.appendChild(chartContainer);
    this.modal.appendChild(content);

    // 添加到页面
    document.body.appendChild(this.modal);

    // 初始化图表
    this.chart = new Chart(canvas, {
      lineColor: getComputedStyle(document.body).getPropertyValue('--primary-color') || '#4A90E2'
    });

    // 点击背景关闭
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });

    // ESC键关闭
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.style.display === 'block') {
        this.close();
      }
    });

    // 窗口大小改变时重新绘制
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (this.modal.style.display === 'block' && this.chart) {
          this.chart.resize();
        }
      }, 150);
    });
  }

  async open(code, name) {
    this.currentCode = code;
    this.currentName = name;
    this.currentDays = 1;

    // 更新标题
    const title = this.modal.querySelector('.chart-modal-title');
    title.textContent = `${name} - 价格走势`;

    // 重置时间范围按钮
    const buttons = this.modal.querySelectorAll('.chart-time-btn');
    buttons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.days === '1');
    });

    // 显示弹窗
    this.modal.style.display = 'block';

    // 使用requestAnimationFrame确保DOM已渲染
    await new Promise(resolve => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.chart.setupCanvas();
          resolve();
        });
      });
    });

    // 加载数据
    await this.loadData();
  }

  close() {
    this.modal.style.display = 'none';
    this.currentCode = null;
    this.currentName = null;
  }

  async changeTimeRange(days) {
    if (this.isLoading || this.currentDays === days) return;

    this.currentDays = days;

    // 更新按钮状态
    const buttons = this.modal.querySelectorAll('.chart-time-btn');
    buttons.forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.days) === days);
    });

    // 重新加载数据
    await this.loadData();
  }

  async loadData() {
    if (this.isLoading || !this.currentCode) return;

    this.isLoading = true;
    this.showLoading(true);

    try {
      // 获取历史数据
      const historyData = await marketService.fetchHistoryData(this.currentCode, this.currentDays);

      console.log('Raw history data:', historyData);

      // 处理并抽样数据
      const chartData = marketService.processHistoryData(historyData, this.currentDays);

      console.log('Processed chart data:', chartData);

      // 更新图表
      if (chartData && chartData.length > 0) {
        this.chart.setData(chartData);
      } else {
        // 显示空数据提示
        this.chart.setData([]);
      }
    } catch (error) {
      console.error('Failed to load chart data:', error);
      this.chart.setData([]);
    } finally {
      this.isLoading = false;
      this.showLoading(false);
    }
  }

  showLoading(show) {
    const loadingEl = this.modal.querySelector('.chart-loading');
    if (loadingEl) {
      loadingEl.style.display = show ? 'flex' : 'none';
    }
  }
}

// 创建全局单例
let chartModalInstance = null;

export function getChartModal() {
  if (!chartModalInstance) {
    chartModalInstance = new ChartModal();
  }
  return chartModalInstance;
}
