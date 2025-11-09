// colorToggle.js
const colorToggleBtn = document.getElementById('colorToggleBtn');
let isReversed = false;

colorToggleBtn.addEventListener('click', () => {
  isReversed = !isReversed;
  document.body.classList.toggle('color-reverse');
});
