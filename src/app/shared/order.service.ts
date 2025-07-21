import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private orders: any[] = [];

  constructor() {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem('orders');
      if (stored) {
        this.orders = JSON.parse(stored);
      }
    }
  }

  setOrders(data: any[]) {
    this.orders = data;
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('orders', JSON.stringify(data));
    }
  }

  getOrders() {
    return this.orders;
  }

  clearOrders() {
    this.orders = [];
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('orders');
    }
  }
}
