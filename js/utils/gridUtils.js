export class GridManager {
  constructor() {
    // 获取所有网格容器
    this.grids = {
      cn: document.getElementById("cnGrid"),
      asia: document.getElementById("asiaGrid"),
      hk: document.getElementById("hkGrid"),
      us: document.getElementById("usGrid"),
      eu: document.getElementById("euGrid"),
      metal: document.getElementById("metalGrid"),
      energy: document.getElementById("energyGrid"),
      fx: document.getElementById("fxGrid"),
      crypto: document.getElementById("cryptoGrid"),
      global: document.getElementById("globalGrid")
    };

    // 定义每个区域需要的行数（2行或1行）
    this.gridRows = {
      cn: 2,    // A股指数：6个，需要2行
      asia: 2,  // 亚洲指数：3个，需要2行
      hk: 2,    // 港股指数：2个，需要2行以对齐
      us: 2,    // 美国指数：3个，需要2行以对齐
      eu: 2,    // 欧洲指数：4个，需要2行
      metal: 2, // 贵金属：5个，需要2行
      energy: 2,// 能源：2个，需要2行以对齐
      fx: 2,    // 外汇：6个，需要2行
      crypto: 2,// 加密货币：5个，需要2行
      global: 1 // 全球市场：2个，1行即可
    };
  }

  addPlaceholders(gridElement, itemCount, targetCount) {
    // 移除现有的占位符
    this.removePlaceholders(gridElement);
    
    const placeholdersNeeded = targetCount - itemCount;
    if (placeholdersNeeded > 0) {
      for (let i = 0; i < placeholdersNeeded; i++) {
        const placeholder = document.createElement("div");
        placeholder.className = "card placeholder";
        // 使用空的div保持结构，但不显示任何内容
        placeholder.innerHTML = '<div></div>';
        gridElement.appendChild(placeholder);
      }
    }
  }

  removePlaceholders(gridElement) {
    gridElement.querySelectorAll('.placeholder').forEach(el => el.remove());
  }

  updatePlaceholders() {
    // 对每个网格区域进行处理
    Object.entries(this.grids).forEach(([category, grid]) => {
      const cards = grid.querySelectorAll('.card:not(.placeholder)');
      const rows = this.gridRows[category];
      const cols = 3; // 每行固定3列
      const targetCount = rows * cols; // 目标卡片数量
      
      // 添加所需的占位符
      this.addPlaceholders(grid, cards.length, targetCount);
    });
  }
}

export const gridManager = new GridManager();