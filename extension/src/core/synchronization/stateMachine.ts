/**
 * Global State Machine for the Nexvora Pipeline
 */

export type ScraperState = 
  | 'IDLE'
  | 'DISCOVERING'
  | 'PROCESSING'
  | 'WAITING_FOR_DATA'
  | 'COMPLETED'
  | 'SCROLLING'
  | 'BACKPRESSURE_PAUSE';

type StateListener = (state: ScraperState) => void;

export class StateMachine {
  private currentState: ScraperState = 'IDLE';
  private listeners: Set<StateListener> = new Set();

  public getState(): ScraperState {
    return this.currentState;
  }

  public transition(newState: ScraperState) {
    if (this.currentState === newState) return;
    
    // console.log(`[StateMachine] Transition: ${this.currentState} -> ${newState}`);
    this.currentState = newState;
    this.listeners.forEach(listener => listener(this.currentState));
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const pipelineState = new StateMachine();
