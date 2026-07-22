let activeRequests = 0;
let listeners = new Set();

function notify() {
  const isLoading = activeRequests > 0;
  listeners.forEach((listener) => listener(isLoading));
}

export function subscribe(listener) {
  listeners.add(listener);
  listener(activeRequests > 0);
  return () => listeners.delete(listener);
}

export function incrementLoading() {
  activeRequests += 1;
  notify();
}

export function decrementLoading() {
  activeRequests = Math.max(0, activeRequests - 1);
  notify();
}

export function getLoadingState() {
  return activeRequests > 0;
}
