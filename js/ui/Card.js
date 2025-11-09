export class Card {
  constructor(item) {
    this.element = document.createElement('div');
    this.element.className = 'card';
    this.render(item);
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
    changeEl.textContent = `${change >= 0 ? "▲" : "▼"} ${change.toFixed(2)} (${percent.toFixed(2)}%)`;
    priceEl.className = `price ${cls}`;
    changeEl.className = `change ${cls}`;
  }

  setError() {
    const priceEl = this.element.querySelector('.price');
    const changeEl = this.element.querySelector('.change');
    
    priceEl.textContent = '--';
    changeEl.textContent = '加载失败';
    priceEl.className = 'price';
    changeEl.className = 'change';
  }
}