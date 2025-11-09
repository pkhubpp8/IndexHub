// =============================
// market.js 完整版（每行6列） 2025-11
// =============================

// 页面分类容器
const grids = {
  cn: document.getElementById("cnGrid"),
  us: document.getElementById("usGrid"),
  hk: document.getElementById("hkGrid"),
  eu: document.getElementById("euGrid"),
  metal: document.getElementById("metalGrid"),
  energy: document.getElementById("energyGrid"),
  fx: document.getElementById("fxGrid"),
  crypto: document.getElementById("cryptoGrid"),
  global: document.getElementById("globalGrid")
};

// 刷新按钮和倒计时
const lastUpdateEl = document.getElementById("lastUpdate");
const btn = document.getElementById("refreshBtn");
const countdownEl = document.getElementById("countdown");

// 创建卡片映射
const cardMap = {};
INDEX_LIST.forEach(item => {
  const div = document.createElement("div");
  div.className = "card";
  div.innerHTML = `
    <div class="name">${item.name}</div>
    <div class="price">--</div>
    <div class="change">--</div>
  `;
  grids[item.category].appendChild(div);
  cardMap[item.code] = div;
});

// 为每个网格添加占位符卡片以保持两行布局
Object.keys(grids).forEach(category => {
  const grid = grids[category];
  const itemCount = grid.children.length;
  const targetCount = 6; // 目标是两行，每行3个
  const placeholdersNeeded = targetCount - itemCount;
  
  if (placeholdersNeeded > 0) {  // 如果需要填充来达到两行
    for (let i = 0; i < placeholdersNeeded; i++) {
      const placeholder = document.createElement("div");
      placeholder.className = "card placeholder";
      placeholder.innerHTML = `
        <div class="name">--</div>
        <div class="price">--</div>
        <div class="change">--</div>
      `;
      grid.appendChild(placeholder);
    }
  }
});

// 解析返回字符串
function parseResponse(text) {
  const result = {};
  const lines = text.split("\n").filter(x => x.includes("hq_str_"));
  for (const line of lines) {
    const m = line.match(/var\s+hq_str_([^=]+)\s*=\s*"([^"]*)"/);
    if (m) result[m[1]] = m[2].split(",");
  }
  return result;
}

// 解析指数数据
function parseIndexData(p, category) {
  if (!p) return { price: 0, change: 0, percent: 0 };
  let price = 0, change = 0, percent = 0;

  switch (category) {
    case "cn":
    case "eu":
      price = parseFloat(p[1]) || 0;
      change = parseFloat(p[2]) || 0;
      percent = parseFloat(p[3]) || 0;
      break;
    case "hk":
      price = parseFloat(p[2]) || 0;
      change = parseFloat(p[7]) || 0;
      percent = parseFloat(p[8]) || 0;
      break;
    case "metal":
    case "energy":
      price = parseFloat(p[0]) || 0;
      const prev = parseFloat(p[7]) || 0;
      change = price - prev;
      percent = prev ? (change / prev) * 100 : 0;
      break;
    case "fx":
      price = parseFloat(p[1]) || 0;
      const prevFX = parseFloat(p[5]) || 0;
      change = price - prevFX;
      percent = prevFX ? (change / prevFX) * 100 : 0;
      break;
    case "crypto":
      price = parseFloat(p[3]) || 0;
      const open = parseFloat(p[7]) || price;
      change = price - open;
      percent = open ? (change / open) * 100 : 0;
      break;
    default:
      price = parseFloat(p[1]) || 0;
      change = parseFloat(p[2]) || 0;
      percent = parseFloat(p[3]) || 0;
  }

  return { price, change, percent };
}

// 更新 UI
function updateUI(data) {
  lastUpdateEl.textContent = `更新时间：${new Date().toLocaleTimeString()}`;
  INDEX_LIST.forEach(item => {
    const p = data[item.code];
    const card = cardMap[item.code];
    if (!p) {
      card.querySelector(".price").textContent = "--";
      card.querySelector(".change").textContent = "加载失败";
      card.querySelector(".price").className = "price";
      card.querySelector(".change").className = "change";
      return;
    }
    try {
      const { price, change, percent } = parseIndexData(p, item.category);
      const cls = change >= 0 ? "up" : "down";
      card.querySelector(".price").textContent = price.toFixed(2);
      card.querySelector(".change").textContent = `${change >= 0 ? "▲" : "▼"} ${change.toFixed(2)} (${percent.toFixed(2)}%)`;
      card.querySelector(".price").className = `price ${cls}`;
      card.querySelector(".change").className = `change ${cls}`;
    } catch(e) { console.error(item.name, e); }
  });

  // 刷新完数据后，对齐6列
  fillGrids(6);
}

// 防止重复刷新
let isRefreshing = false;
async function refreshAll() {
  if (isRefreshing) return;
  isRefreshing = true;
  btn.disabled = true;
  btn.style.opacity = 0.6;
  btn.textContent = "加载中...";
  try {
    const codes = INDEX_LIST.map(i => i.code).join(",");
    const res = await fetch(`${PROXY}?code=${codes}`);
    const text = await res.text();
    const data = parseResponse(text);
    updateUI(data);
  } catch(e) {
    console.error("数据请求失败", e);
  } finally {
    btn.disabled = false;
    btn.style.opacity = 1;
    btn.textContent = "🔁 立即刷新";
    isRefreshing = false;
  }
}

// 倒计时
let seconds = 60;
function tick() {
  countdownEl.textContent = `${seconds} 秒后自动刷新`;
  seconds--;
  if (seconds < 0) {
    seconds = 60;
    refreshAll();
  }
}
setInterval(tick, 1000);

// 点击刷新
btn.addEventListener("click", () => {
  seconds = 60;
  refreshAll();
});

// 启动立即刷新一次
refreshAll();


// =============================
// 自动补齐每行6个卡片（保持整齐）
// =============================
function fillGrids(columns = 6) {
  Object.values(grids).forEach(grid => {
    // 移除旧的占位符
    grid.querySelectorAll(".placeholder").forEach(el => el.remove());
    const cards = grid.querySelectorAll(".card:not(.placeholder)");
    const remainder = cards.length % columns;
    if (remainder > 0) {
      const need = columns - remainder;
      for (let i = 0; i < need; i++) {
        const ph = document.createElement("div");
        ph.className = "card placeholder";
        grid.appendChild(ph);
      }
    }
  });
}

// 页面初次加载时执行一次补齐
fillGrids(6);
