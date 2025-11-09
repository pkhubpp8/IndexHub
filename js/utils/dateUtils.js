export function formatTime(date) {
  return date.toLocaleTimeString();
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}