export class ThemeManager {
  constructor() {
    this.themeButton = document.getElementById('themeToggleBtn');
    this.colorButton = document.getElementById('colorToggleBtn');
    this.initialize();
  }

  initialize() {
    this.themeButton.addEventListener('click', () => this.toggleTheme());
    this.colorButton.addEventListener('click', () => this.toggleColor());

    // 从本地存储恢复主题设置
    const darkMode = localStorage.getItem('darkMode') === 'true';
    
    // 兼容旧的存储方式，迁移到新的 colorMode
    let colorMode = localStorage.getItem('colorMode');
    if (!colorMode) {
      // 检查旧的存储方式
      const colorblindMode = localStorage.getItem('colorblindMode') === 'true';
      const redGreenMode = localStorage.getItem('redGreenMode') === 'true';
      
      if (colorblindMode) {
        colorMode = 'colorblind';
      } else if (redGreenMode) {
        colorMode = 'red-green';
      } else {
        colorMode = 'green-red'; // 默认是绿涨红跌（原来的默认）
      }
      
      // 迁移到新格式
      localStorage.setItem('colorMode', colorMode);
      // 清理旧数据（可选）
      localStorage.removeItem('colorblindMode');
      localStorage.removeItem('redGreenMode');
    }

    if (darkMode) {
      document.body.classList.add('dark');
    }
    
    // 根据保存的模式恢复状态
    this.setColorMode(colorMode);
  }

  setColorMode(mode) {
    // 清除所有颜色模式类
    document.body.classList.remove('red-green', 'green-red', 'colorblind');
    
    // 应用新的颜色模式
    if (mode === 'colorblind') {
      document.body.classList.add('colorblind');
      this.colorButton.textContent = '🎨';
    } else if (mode === 'green-red') {
      document.body.classList.add('green-red');
      this.colorButton.textContent = '🔄';
    } else {
      // 默认 red-green
      document.body.classList.add('red-green');
      this.colorButton.textContent = '🔄';
    }
    
    localStorage.setItem('colorMode', mode);
    
    // 触发自定义事件，通知应用更新卡片
    window.dispatchEvent(new CustomEvent('colorModeChanged', { 
      detail: { mode } 
    }));
  }

  toggleTheme() {
    // 使用 requestAnimationFrame 确保过渡更平滑
    requestAnimationFrame(() => {
      const isDark = document.body.classList.toggle('dark');
      localStorage.setItem('darkMode', isDark);
    });
  }

  toggleColor() {
    // 获取当前颜色模式
    const currentMode = localStorage.getItem('colorMode') || 'red-green';
    
    // 循环切换：红涨绿跌 -> 绿涨红跌 -> 色觉障碍模式 -> 红涨绿跌
    let nextMode;
    if (currentMode === 'red-green') {
      nextMode = 'green-red';
    } else if (currentMode === 'green-red') {
      nextMode = 'colorblind';
    } else {
      nextMode = 'red-green';
    }
    
    this.setColorMode(nextMode);
  }
}

export const themeManager = new ThemeManager();