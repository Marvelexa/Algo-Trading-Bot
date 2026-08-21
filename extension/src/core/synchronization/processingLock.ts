export class ProcessingLock {
  private static owner: string | null = null;
  private static reason: string | null = null;
  private static locked = false;
  private static unlockListeners: (() => void)[] = [];

  public static acquire(owner: string, reason: string) {
    this.locked = true;
    this.owner = owner;
    this.reason = reason;
  }

  public static async waitIfLocked(): Promise<void> {
    if (!this.locked) return Promise.resolve();
    return new Promise(resolve => {
      this.unlockListeners.push(resolve);
    });
  }

  public static release() {
    this.locked = false;
    this.owner = null;
    this.reason = null;
    this.unlockListeners.forEach(fn => fn());
    this.unlockListeners = [];
  }

  public static getLockStatus() {
    return { isLocked: this.locked, owner: this.owner, reason: this.reason };
  }
}
