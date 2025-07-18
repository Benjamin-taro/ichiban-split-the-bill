import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private orders: any[] = [];

  setOrders(data: any[]) {
    this.orders = data;
  }

  getOrders(): any[] {
    return this.orders;
  }
}
