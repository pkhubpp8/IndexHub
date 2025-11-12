export class ModalManager {
  constructor() {
    this.currentModal = null; // 当前打开的弹窗
    this.modals = new Map(); // 存储所有弹窗实例
    this.eventDelegateBound = false; // 事件委托是否已绑定
    this.categoryNames = {
      cn: 'A股指数',
      hk: '香港指数',
      us: '美国指数',
      eu: '欧洲指数',
      asia: '亚洲指数',
      global: '全球 / 新兴市场',
      metal: '金属',
      energy: '能源',
      fx: '外汇',
      crypto: '加密货币'
    };
    
    this.initializeModals();
    this.setupResizeHandler();
  }
  
  // 保存弹窗位置到localStorage
  saveModalPosition(category, xOffset, yOffset) {
    try {
      const position = { x: xOffset, y: yOffset };
      localStorage.setItem(`modal_position_${category}`, JSON.stringify(position));
    } catch (error) {
      console.warn('Failed to save modal position:', error);
    }
  }
  
  // 从localStorage恢复弹窗位置
  getModalPosition(category) {
    try {
      const saved = localStorage.getItem(`modal_position_${category}`);
      if (saved) {
        const position = JSON.parse(saved);
        return { x: position.x || 0, y: position.y || 0 };
      }
    } catch (error) {
      console.warn('Failed to load modal position:', error);
    }
    return { x: 0, y: 0 };
  }

  initializeModals() {
    // 为每个类别创建弹窗
    const categories = Object.keys(this.categoryNames);
    const modalContainer = document.getElementById('modalContainer');
    
    if (!modalContainer) {
      console.error('modalContainer not found, retrying...');
      // 如果DOM还没准备好，延迟重试
      setTimeout(() => this.initializeModals(), 100);
      return;
    }
    
    categories.forEach(category => {
      const modal = this.createModal(category);
      modalContainer.appendChild(modal);
      this.modals.set(category, modal);
    });
    
    // 使用事件委托，监听所有"查看更多"按钮的点击事件
    // 这样即使按钮是动态显示/隐藏的，事件也能正常工作
    // 只绑定一次，避免重复绑定
    if (!this.eventDelegateBound) {
      document.addEventListener('click', (e) => {
        // 检查点击的是否是"查看更多"按钮
        if (e.target && e.target.classList.contains('more-btn')) {
          const btnId = e.target.id;
          // 从按钮ID中提取类别名称（例如：metalMoreBtn -> metal）
          const match = btnId.match(/^(\w+)MoreBtn$/);
          if (match) {
            const category = match[1];
            if (this.modals.has(category)) {
              e.preventDefault();
              this.openModal(category);
            }
          }
        }
      });
      this.eventDelegateBound = true;
    }
  }

  createModal(category) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = `${category}Modal`;
    modal.style.display = 'none';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.setAttribute('data-category', category);
    modalContent.style.cursor = 'move'; // 设置整个弹窗内容可拖动样式
    
    const modalHeader = document.createElement('div');
    modalHeader.className = 'modal-header';
    modalHeader.style.cursor = 'move'; // 设置可拖动样式
    
    const title = document.createElement('h3');
    title.textContent = `${this.categoryNames[category]}详情`;
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-btn';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => this.closeModal());
    
    modalHeader.appendChild(title);
    modalHeader.appendChild(closeBtn);
    
    const modalBody = document.createElement('div');
    modalBody.className = 'modal-body';
    
    const grid = document.createElement('div');
    grid.className = 'grid';
    grid.id = `${category}GridFull`;
    
    modalBody.appendChild(grid);
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalBody);
    modal.appendChild(modalContent);
    
    // 设置拖动功能 - 整个弹窗内容都可以拖动
    this.setupDrag(modalContent, modalContent, category);
    
    // 点击弹窗外部关闭（但拖动时不移除）
    let mouseDownOnModal = false;
    let mouseDownTime = 0;
    
    modal.addEventListener('mousedown', (e) => {
      if (e.target === modal) {
        mouseDownOnModal = true;
        mouseDownTime = Date.now();
      }
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        const dragData = modalContent._dragData;
        // 检查是否正在拖动或刚刚完成拖动
        if (dragData && (dragData.isDragging || dragData.justFinishedDragging)) {
          return;
        }
        // 检查是否是快速点击（不是拖动）
        const clickDuration = Date.now() - mouseDownTime;
        if (clickDuration < 200) { // 200ms内的点击才认为是点击，不是拖动
          this.closeModal();
        }
      }
      mouseDownOnModal = false;
    });
    
    modal.addEventListener('mouseup', (e) => {
      if (e.target === modal) {
        const dragData = modalContent._dragData;
        // 如果刚刚完成拖动，不关闭
        if (dragData && dragData.justFinishedDragging) {
          return;
        }
      }
    });
    
    // 阻止弹窗内容的点击事件冒泡到modal
    modalContent.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    
    return modal;
  }

  setupDrag(modalContent, dragHandle, category) {
    // 保存this引用，以便在回调中使用
    const self = this;
    
    // 将拖动状态存储在元素上，以便在重置时访问
    const dragData = {
      isDragging: false,
      justFinishedDragging: false,
      xOffset: 0,
      yOffset: 0
    };
    modalContent._dragData = dragData;
    
    // 检查元素是否是可交互的元素（不应该触发拖动）
    const isInteractiveElement = (element) => {
      if (!element) return false;
      // 检查是否是按钮、链接、输入框等交互元素
      const tagName = element.tagName.toLowerCase();
      const interactiveTags = ['button', 'a', 'input', 'select', 'textarea'];
      if (interactiveTags.includes(tagName)) return true;
      // 检查是否有特定的类名
      if (element.classList.contains('close-btn')) return true;
      // 检查是否是可点击的卡片
      if (element.closest('.card')) return false; // 卡片可以拖动
      return false;
    };
    
    dragHandle.addEventListener('mousedown', (e) => {
      // 如果点击的是交互元素，不启动拖动
      if (isInteractiveElement(e.target)) {
        return;
      }
      
      // 如果点击的是交互元素的子元素，也不启动拖动
      let current = e.target;
      while (current && current !== dragHandle) {
        if (isInteractiveElement(current)) {
          return;
        }
        current = current.parentElement;
      }
      
      // 检查是否点击在卡片内的文本元素上
      // 如果点击的是文本元素（如 .name, .price, .change），允许文本选择，不启动拖动
      const clickedElement = e.target;
      const card = clickedElement.closest('.card');
      if (card) {
        // 检查点击的是否是文本元素或其子元素
        const textElements = card.querySelectorAll('.name, .price, .change');
        for (const textEl of textElements) {
          if (textEl.contains(clickedElement) || textEl === clickedElement) {
            // 允许文本选择，不阻止默认行为，不启动拖动
            return;
          }
        }
        // 如果点击的是卡片但不是文本元素，可以拖动（但需要移动超过阈值）
      }
      
      const initialX = e.clientX - dragData.xOffset;
      const initialY = e.clientY - dragData.yOffset;
      
      if (e.button === 0) { // 左键
        // 记录初始位置，用于判断是否真的拖动
        let hasMoved = false;
        const moveThreshold = 5; // 移动超过5px才认为是拖动
        
        dragHandle.style.cursor = 'grabbing';
        e.preventDefault();
        
        const onMouseMove = (e) => {
          const currentX = e.clientX - initialX;
          const currentY = e.clientY - initialY;
          
          // 计算从初始位置移动的距离
          if (!hasMoved) {
            const distance = Math.sqrt(
              Math.pow(currentX - dragData.xOffset, 2) + 
              Math.pow(currentY - dragData.yOffset, 2)
            );
            
            // 如果移动距离超过阈值，才开始拖动
            if (distance > moveThreshold) {
              hasMoved = true;
              dragData.isDragging = true;
              modalContent.style.userSelect = 'none';
            }
          }
          
          if (dragData.isDragging) {
            e.preventDefault();
            
            dragData.xOffset = currentX;
            dragData.yOffset = currentY;
            
            // 限制拖动范围，确保弹窗不会完全移出视口
            // 获取弹窗的实际尺寸
            const modalRect = modalContent.getBoundingClientRect();
            const modalWidth = modalRect.width;
            const modalHeight = modalRect.height;
            
            // 最小边距，确保弹窗始终有一部分可见
            const minMargin = 20;
            
            // 计算弹窗在当前位置（未应用transform时）的边界
            // 由于弹窗初始是居中的，我们需要计算相对于初始位置的偏移限制
            // 弹窗初始位置：水平居中，垂直5vh
            const initialTop = window.innerHeight * 0.05; // 5vh
            const initialLeft = (window.innerWidth - modalWidth) / 2;
            
            // 计算可以拖动的范围
            // 向右拖动：弹窗右边缘不能超过窗口右边缘减去minMargin
            // 当前右边缘位置 = initialLeft + modalWidth + xOffset
            // 限制：initialLeft + modalWidth + xOffset <= window.innerWidth - minMargin
            // 所以：xOffset <= window.innerWidth - minMargin - initialLeft - modalWidth
            const maxX = window.innerWidth - minMargin - initialLeft - modalWidth;
            
            // 向左拖动：弹窗左边缘不能小于minMargin
            // 当前左边缘位置 = initialLeft + xOffset
            // 限制：initialLeft + xOffset >= minMargin
            // 所以：xOffset >= minMargin - initialLeft
            const minX = minMargin - initialLeft;
            
            // 向下拖动：弹窗底边缘不能超过窗口底边缘减去minMargin
            // 当前底边缘位置 = initialTop + modalHeight + yOffset
            // 限制：initialTop + modalHeight + yOffset <= window.innerHeight - minMargin
            // 所以：yOffset <= window.innerHeight - minMargin - initialTop - modalHeight
            const maxY = window.innerHeight - minMargin - initialTop - modalHeight;
            
            // 向上拖动：弹窗顶边缘不能小于minMargin
            // 当前顶边缘位置 = initialTop + yOffset
            // 限制：initialTop + yOffset >= minMargin
            // 所以：yOffset >= minMargin - initialTop
            const minY = minMargin - initialTop;
            
            // 应用限制
            dragData.xOffset = Math.max(minX, Math.min(maxX, dragData.xOffset));
            dragData.yOffset = Math.max(minY, Math.min(maxY, dragData.yOffset));
            
            modalContent.style.transform = `translate(${dragData.xOffset}px, ${dragData.yOffset}px)`;
          }
        };
        
        const onMouseUp = (e) => {
          // 无论是否拖动，都要清理事件监听和样式
          if (dragData.isDragging) {
            dragData.isDragging = false;
            // 保存当前位置
            if (category) {
              self.saveModalPosition(category, dragData.xOffset, dragData.yOffset);
            }
            
            // 如果鼠标在modal背景上松开，阻止关闭弹窗
            // 通过设置一个临时标志，在短时间内阻止关闭
            dragData.justFinishedDragging = true;
            setTimeout(() => {
              dragData.justFinishedDragging = false;
            }, 100);
          }
          
          // 恢复样式和移除事件监听
          dragHandle.style.cursor = '';
          modalContent.style.userSelect = '';
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
        };
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      }
    });
  }

  openModal(category) {
    // 如果已经有打开的弹窗，先关闭它
    if (this.currentModal) {
      this.closeModal();
    }
    
    const modal = this.modals.get(category);
    if (modal) {
      modal.style.display = 'block';
      this.currentModal = category;
      
      // 恢复之前保存的位置（使用requestAnimationFrame确保DOM已更新）
      requestAnimationFrame(() => {
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
          // 获取保存的位置
          const savedPosition = this.getModalPosition(category);
          
          // 恢复偏移量
          const dragHandle = modalContent.querySelector('.modal-header');
          if (dragHandle) {
            dragHandle.style.cursor = 'move';
          }
          modalContent.style.transform = `translate(${savedPosition.x}px, ${savedPosition.y}px)`;
          
          // 恢复内部偏移量变量
          const dragData = modalContent._dragData;
          if (dragData) {
            dragData.xOffset = savedPosition.x;
            dragData.yOffset = savedPosition.y;
            dragData.isDragging = false;
            dragData.justFinishedDragging = false;
          }
          
          // 检查并调整位置，确保在新窗口大小下仍然有效
          setTimeout(() => {
            this.adjustModalPosition(category);
          }, 100);
        }
      });
    }
  }

  closeModal() {
    if (this.currentModal) {
      const modal = this.modals.get(this.currentModal);
      if (modal) {
        modal.style.display = 'none';
        // 重置位置
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
          modalContent.style.transform = 'translate(0, 0)';
        }
      }
      this.currentModal = null;
    }
  }

  // ESC键关闭弹窗
  setupEscapeKey() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.currentModal) {
        this.closeModal();
      }
    });
  }
  
  // 调整弹窗位置，确保它在视口内
  adjustModalPosition(category) {
    if (!category) return;
    
    const modal = this.modals.get(category);
    if (!modal || modal.style.display !== 'block') return;
    
    const modalContent = modal.querySelector('.modal-content');
    if (!modalContent) return;
    
    const dragData = modalContent._dragData;
    if (!dragData) return;
    
    // 获取弹窗的实际尺寸
    const modalRect = modalContent.getBoundingClientRect();
    const modalWidth = modalRect.width;
    const modalHeight = modalRect.height;
    
    // 计算弹窗初始位置
    const initialTop = window.innerHeight * 0.05;
    const initialLeft = (window.innerWidth - modalWidth) / 2;
    
    // 计算可拖动的范围
    const minMargin = 20;
    const maxX = window.innerWidth - minMargin - initialLeft - modalWidth;
    const minX = minMargin - initialLeft;
    const maxY = window.innerHeight - minMargin - initialTop - modalHeight;
    const minY = minMargin - initialTop;
    
    // 如果当前位置超出范围，调整到范围内
    let newX = dragData.xOffset;
    let newY = dragData.yOffset;
    
    if (newX < minX) newX = minX;
    if (newX > maxX) newX = maxX;
    if (newY < minY) newY = minY;
    if (newY > maxY) newY = maxY;
    
    // 如果位置需要调整，更新位置
    if (newX !== dragData.xOffset || newY !== dragData.yOffset) {
      dragData.xOffset = newX;
      dragData.yOffset = newY;
      modalContent.style.transform = `translate(${newX}px, ${newY}px)`;
      // 保存调整后的位置
      this.saveModalPosition(category, newX, newY);
    }
  }
  
  // 设置窗口大小改变监听
  setupResizeHandler() {
    let resizeTimer;
    window.addEventListener('resize', () => {
      // 防抖处理，避免频繁调整
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (this.currentModal) {
          this.adjustModalPosition(this.currentModal);
        }
      }, 150);
    });
  }
}

// 延迟初始化，确保DOM加载完成后再创建实例
let modalManagerInstance = null;

function initModalManager() {
  if (!modalManagerInstance) {
    try {
      modalManagerInstance = new ModalManager();
      modalManagerInstance.setupEscapeKey();
    } catch (error) {
      console.error('Failed to initialize ModalManager:', error);
    }
  }
  return modalManagerInstance;
}

// 如果DOM已经加载完成，立即初始化；否则等待DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initModalManager);
} else {
  // DOM已加载，但可能还需要一点时间，延迟一点执行
  setTimeout(initModalManager, 0);
}

// 导出getter函数
export function getModalManagerInstance() {
  return modalManagerInstance || initModalManager();
}
