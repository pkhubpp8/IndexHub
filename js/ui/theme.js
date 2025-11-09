export class ThemeManager {
  constructor() {
    this.button = document.getElementById('colorToggleBtn');
    this.initialize();
  }

  initialize() {
    this.button.addEventListener('click', () => this.toggleTheme());

    // 从本地存储恢复主题设置
    const darkMode = localStorage.getItem('darkMode') === 'true';
    if (darkMode) {
      document.body.classList.add('dark');
    }
  }

  toggleTheme() {
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem('darkMode', isDark);
  }
}

export const themeManager = new ThemeManager();