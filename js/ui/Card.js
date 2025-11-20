import { getChartModal } from './ChartModal.js';

export class Card {
  constructor(item) {
    this.item = item;
    this.element = document.createElement('div');
    this.element.className = 'card';
    this.render(item);
    this.setupClickHandler();
  }

  setupClickHandler() {
    this.element.style.cursor = 'pointer';
    this.element.addEventListener('click', (e) => {
      // 防止文本选择时触发点击
      const selection = window.getSelection();
      if (selection && selection.toString().length > 0) {
        return;
      }

      const chartModal = getChartModal();
      chartModal.open(this.item.code, this.item.name);
    });
  }

  render(item) {
    this.element.innerHTML = `
      <div class="name">${item.name}</div>
      <div class="price">--</div>
      <div class="change">--</div>
    `;
  }

  update(data) {
    if (!data) {
      this.setError();
      return;
    }

    const { price, change, percent } = data;
    const cls = change >= 0 ? 'up' : 'down';
    const priceEl = this.element.querySelector('.price');
    const changeEl = this.element.querySelector('.change');

    priceEl.textContent = price.toFixed(2);
    changeEl.textContent = `${change >= 0 ? "▲" : "▼"} ${change >= 0 ? "+" : ""}${change.toFixed(2)} (${change >= 0 ? "+" : ""}${percent.toFixed(2)}%)`;
    priceEl.className = `price ${cls}`;
    changeEl.className = `change ${cls}`;

    // 色觉障碍模式下添加额外的视觉指示器
    if (document.body.classList.contains('colorblind')) {
      this.element.classList.remove('up-indicator', 'down-indicator');
      this.element.classList.add(`${cls}-indicator`);
    } else {
      this.element.classList.remove('up-indicator', 'down-indicator');
    }
  }

  setError() {
    const priceEl = this.element.querySelector('.price');
    const changeEl = this.element.querySelector('.change');

    priceEl.textContent = '--';
    changeEl.textContent = '加载失败';
    priceEl.className = 'price';
    changeEl.className = 'change';

    // 移除色觉障碍模式的指示器
    this.element.classList.remove('up-indicator', 'down-indicator');
  }

  updateColorIndicators() {
    // 根据当前价格状态更新颜色模式的指示器
    const priceEl = this.element.querySelector('.price');
    if (priceEl && priceEl.classList.contains('up')) {
      if (document.body.classList.contains('colorblind')) {
        this.element.classList.remove('down-indicator');
        this.element.classList.add('up-indicator');
      } else {
        this.element.classList.remove('up-indicator', 'down-indicator');
      }
    } else if (priceEl && priceEl.classList.contains('down')) {
      if (document.body.classList.contains('colorblind')) {
        this.element.classList.remove('up-indicator');
        this.element.classList.add('down-indicator');
      } else {
        this.element.classList.remove('up-indicator', 'down-indicator');
      }
    } else {
      this.element.classList.remove('up-indicator', 'down-indicator');
    }
  }
}