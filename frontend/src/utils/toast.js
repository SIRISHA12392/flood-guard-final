export class Toast {
  static show(message, type = 'info', duration = 3000) {
    const toastContainer = document.getElementById('toast-container') || this.createContainer()
    
    const toast = document.createElement('div')
    toast.className = `toast toast-${type}`
    toast.textContent = message
    
    toastContainer.appendChild(toast)
    
    setTimeout(() => {
      toast.classList.add('toast-exit')
      setTimeout(() => toast.remove(), 300)
    }, duration)
  }

  static createContainer() {
    const container = document.createElement('div')
    container.id = 'toast-container'
    container.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    `
    document.body.appendChild(container)
    return container
  }

  static success(message, duration = 3000) {
    this.show(message, 'success', duration)
  }

  static error(message, duration = 4000) {
    this.show(message, 'error', duration)
  }

  static warning(message, duration = 3500) {
    this.show(message, 'warning', duration)
  }

  static info(message, duration = 3000) {
    this.show(message, 'info', duration)
  }
}
