export const DeepExtractionState = {
  active: false,
  
  async waitIfActive(): Promise<void> {
    if (!this.active) return Promise.resolve();
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (!this.active) {
          clearInterval(interval);
          resolve();
        }
      }, 100);
    });
  }
};
