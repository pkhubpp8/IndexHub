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
    const redGreenMode = localStorage.getItem('redGreenMode') === 'true';

    if (darkMode) {
      document.body.classList.add('dark');
    }
    if (redGreenMode) {
      document.body.classList.add('red-green');
    } else {
      document.body.classList.add('green-red');
    }
  }

  toggleTheme() {
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem('darkMode', isDark);
  }

  toggleColor() {
    const isRedGreen = document.body.classList.toggle('red-green');
    document.body.classList.toggle('green-red', !isRedGreen);
    localStorage.setItem('redGreenMode', isRedGreen);
  }
}

export const themeManager = new ThemeManager();