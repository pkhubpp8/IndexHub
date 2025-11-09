export class ModalManager {
  constructor() {
    // 获取所有需要的DOM元素
    this.modalBtn = document.getElementById('metalMoreBtn');
    this.modal = document.getElementById('metalModal');
    this.closeBtn = document.getElementById('metalModalClose');
    this.modalGrid = document.getElementById('metalGridFull');

    this.setupMetalModal();
  }

  setupMetalModal() {
    if (!this.modalBtn || !this.modal || !this.closeBtn) {
      console.warn('Modal elements not found');
      return;
    }

    // 点击"查看更多"按钮打开弹窗
    this.modalBtn.addEventListener('click', () => {
      this.modal.style.display = 'block';
    });

    // 点击关闭按钮
    this.closeBtn.addEventListener('click', () => {
      this.closeModal();
    });

    // 点击弹窗外部关闭
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.closeModal();
      }
    });

    // ESC键关闭弹窗
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.style.display === 'block') {
        this.closeModal();
      }
    });

    // 阻止弹窗内容的点击事件冒泡到modal
    this.modal.querySelector('.modal-content').addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  closeModal() {
    this.modal.style.display = 'none';
  }
}