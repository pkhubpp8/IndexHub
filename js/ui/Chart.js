export class Chart {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.options = {
      padding: { top: 20, right: 20, bottom: 40, left: 60 },
      gridColor: 'rgba(128, 128, 128, 0.2)',
      axisColor: 'rgba(128, 128, 128, 0.5)',
      lineColor: '#4A90E2',
      lineWidth: 2,
      pointRadius: 0,
      showGrid: true,
      showAxis: true,
      ...options
    };
    this.data = [];
    this.setupCanvas();
  }

  setupCanvas() {
    // 强制浏览器重新计算布局
    this.canvas.offsetHeight;

    // 从父容器获取尺寸
    const parent = this.canvas.parentElement;
    if (!parent) {
      console.error('Canvas has no parent element');
      return;
    }

    const parentRect = parent.getBoundingClientRect();
    console.log('setupCanvas - parent rect:', parentRect);

    // 计算Canvas实际可用空间（减去父容器的padding）
    const parentStyle = window.getComputedStyle(parent);
    const paddingLeft = parseFloat(parentStyle.paddingLeft) || 0;
    const paddingRight = parseFloat(parentStyle.paddingRight) || 0;
    const paddingTop = parseFloat(parentStyle.paddingTop) || 0;
    const paddingBottom = parseFloat(parentStyle.paddingBottom) || 0;

    const availableWidth = parentRect.width - paddingLeft - paddingRight;
    const availableHeight = parentRect.height - paddingTop - paddingBottom;

    console.log('setupCanvas - available size:', { width: availableWidth, height: availableHeight });

    // 设置高DPI显示
    const dpr = window.devicePixelRatio || 1;

    this.canvas.width = availableWidth * dpr;
    this.canvas.height = availableHeight * dpr;
    this.ctx.scale(dpr, dpr);
    this.canvas.style.width = availableWidth + 'px';
    this.canvas.style.height = availableHeight + 'px';

    console.log('setupCanvas - final canvas size:', { width: this.canvas.width, height: this.canvas.height });
  }

  setData(data) {
    console.log('Chart.setData called with:', data);
    this.data = data;
    this.draw();
  }

  draw() {
    console.log('Chart.draw called, data length:', this.data?.length);

    if (!this.data || this.data.length === 0) {
      this.drawEmpty();
      return;
    }

    this.clear();

    const { padding } = this.options;
    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    console.log('Canvas dimensions:', { width, height, chartWidth, chartHeight });

    // 计算数据范围
    const values = this.data.map(d => d.price);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const valueRange = maxValue - minValue || 1;

    console.log('Value range:', { minValue, maxValue, valueRange });

    // 添加一些边距使图表更美观
    const margin = valueRange * 0.1;
    const displayMin = minValue - margin;
    const displayMax = maxValue + margin;
    const displayRange = displayMax - displayMin;

    // 绘制网格和坐标轴
    if (this.options.showGrid) {
      this.drawGrid(padding, chartWidth, chartHeight);
    }
    if (this.options.showAxis) {
      this.drawAxis(padding, chartWidth, chartHeight, displayMin, displayMax);
    }

    // 绘制折线
    this.drawLine(padding, chartWidth, chartHeight, displayMin, displayRange);

    // 绘制时间轴标签
    this.drawTimeLabels(padding, chartWidth, chartHeight);
  }

  clear() {
    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);
    this.ctx.clearRect(0, 0, width, height);
  }

  drawEmpty() {
    this.clear();
    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);

    this.ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-secondary') || '#999';
    this.ctx.font = '14px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('暂无历史数据', width / 2, height / 2);
  }

  drawGrid(padding, chartWidth, chartHeight) {
    this.ctx.strokeStyle = this.options.gridColor;
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([2, 2]);

    // 绘制横向网格线（5条）
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartHeight / 5) * i;
      this.ctx.beginPath();
      this.ctx.moveTo(padding.left, y);
      this.ctx.lineTo(padding.left + chartWidth, y);
      this.ctx.stroke();
    }

    // 绘制纵向网格线（根据数据点数量）
    const lineCount = Math.min(6, this.data.length);
    for (let i = 0; i <= lineCount; i++) {
      const x = padding.left + (chartWidth / lineCount) * i;
      this.ctx.beginPath();
      this.ctx.moveTo(x, padding.top);
      this.ctx.lineTo(x, padding.top + chartHeight);
      this.ctx.stroke();
    }

    this.ctx.setLineDash([]);
  }

  drawAxis(padding, chartWidth, chartHeight, minValue, maxValue) {
    this.ctx.strokeStyle = this.options.axisColor;
    this.ctx.lineWidth = 1;
    this.ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-secondary') || '#666';
    this.ctx.font = '11px sans-serif';

    // Y轴标签（5个刻度）
    this.ctx.textAlign = 'right';
    this.ctx.textBaseline = 'middle';
    for (let i = 0; i <= 5; i++) {
      const value = maxValue - (maxValue - minValue) * (i / 5);
      const y = padding.top + (chartHeight / 5) * i;
      this.ctx.fillText(value.toFixed(2), padding.left - 10, y);
    }
  }

  drawLine(padding, chartWidth, chartHeight, minValue, valueRange) {
    if (this.data.length === 0) return;

    this.ctx.strokeStyle = this.options.lineColor;
    this.ctx.lineWidth = this.options.lineWidth;
    this.ctx.lineJoin = 'round';
    this.ctx.lineCap = 'round';

    this.ctx.beginPath();

    this.data.forEach((point, index) => {
      const x = padding.left + (chartWidth / (this.data.length - 1 || 1)) * index;
      const y = padding.top + chartHeight - ((point.price - minValue) / valueRange) * chartHeight;

      if (index === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    });

    this.ctx.stroke();

    // 绘制数据点
    if (this.options.pointRadius > 0) {
      this.ctx.fillStyle = this.options.lineColor;
      this.data.forEach((point, index) => {
        const x = padding.left + (chartWidth / (this.data.length - 1 || 1)) * index;
        const y = padding.top + chartHeight - ((point.price - minValue) / valueRange) * chartHeight;

        this.ctx.beginPath();
        this.ctx.arc(x, y, this.options.pointRadius, 0, Math.PI * 2);
        this.ctx.fill();
      });
    }
  }

  drawTimeLabels(padding, chartWidth, chartHeight) {
    if (this.data.length === 0) return;

    this.ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-secondary') || '#666';
    this.ctx.font = '10px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';

    // 显示首尾和中间的时间标签
    const labelPositions = [0, Math.floor(this.data.length / 2), this.data.length - 1];

    labelPositions.forEach(index => {
      if (index >= 0 && index < this.data.length) {
        const point = this.data[index];
        const x = padding.left + (chartWidth / (this.data.length - 1 || 1)) * index;
        const y = padding.top + chartHeight + 10;

        const date = new Date(point.timestamp);
        const timeStr = this.formatTimeLabel(date);
        this.ctx.fillText(timeStr, x, y);
      }
    });
  }

  formatTimeLabel(date) {
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      // 今天，显示时间
      return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    } else if (diffDays < 7) {
      // 一周内，显示月-日
      return `${date.getMonth() + 1}/${date.getDate()}`;
    } else {
      // 更早，显示月-日
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }
  }

  resize() {
    this.setupCanvas();
    this.draw();
  }
}
