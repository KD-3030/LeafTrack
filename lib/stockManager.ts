// Global stock management to simulate real-time updates between admin and salesman
export interface StockUpdate {
  assignmentId: string;
  quantitySold: number;
  timestamp: string;
  salesmanId: string;
  productId: string;
}

class StockManager {
  private static instance: StockManager;
  private stockUpdates: StockUpdate[] = [];
  private listeners: ((updates: StockUpdate[]) => void)[] = [];

  static getInstance(): StockManager {
    if (!StockManager.instance) {
      StockManager.instance = new StockManager();
    }
    return StockManager.instance;
  }

  addStockUpdate(update: StockUpdate) {
    this.stockUpdates.push(update);
    this.notifyListeners();
  }

  getStockUpdates(): StockUpdate[] {
    return [...this.stockUpdates];
  }

  getTotalSoldForAssignment(assignmentId: string): number {
    return this.stockUpdates
      .filter(update => update.assignmentId === assignmentId)
      .reduce((total, update) => total + update.quantitySold, 0);
  }

  subscribe(listener: (updates: StockUpdate[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.stockUpdates));
  }
}

export const stockManager = StockManager.getInstance();