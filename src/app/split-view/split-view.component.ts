import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { OrderService } from '../shared/order.service';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { CheckboxModule } from 'primeng/checkbox';


@Component({
  selector: 'app-split-view',
  imports: [CommonModule, RouterModule, ButtonModule, InputTextModule, InputNumberModule, FormsModule, TableModule, CheckboxModule],
  standalone: true,
  templateUrl: './split-view.component.html',
  styleUrl: './split-view.component.css'
})
export class SplitViewComponent implements OnInit {
  orders: any[] = [];
  customerLabels: string[] = [];
  numberOfCustomers: number = 1;
  checked: boolean = false;
  subtotals: number[] = [];

  constructor(private orderService: OrderService) {}

  ngOnInit() {
    const savedOrders = localStorage.getItem('orders');
    if (savedOrders) {
      this.orders = JSON.parse(savedOrders);
      console.log('Loaded orders from localStorage:', this.orders);
    } else {
      this.orders = this.orderService.getOrders();  // フォールバック
      console.warn('No localStorage orders found, falling back to service.');
    }

    this.updateCustomerColumns();
  }

  updateCustomerColumns() {
    // カスタマー列ラベル更新
    this.customerLabels = Array.from({ length: this.numberOfCustomers }, (_, i) => `C${i + 1}`);

    // 各アイテムの customers 配列の長さを numberOfCustomers に合わせる
    const items = this.orders[0]?.items || [];
    for (let item of items) {
      if (!item.customers) {
        item.customers = Array(this.numberOfCustomers).fill(0);
      } else {
        // 長さ調整
        if (item.customers.length < this.numberOfCustomers) {
          item.customers.push(...Array(this.numberOfCustomers - item.customers.length).fill(0));
        } else if (item.customers.length > this.numberOfCustomers) {
          item.customers.length = this.numberOfCustomers;
        }
      }
    }
  }

  handleQuantityChange(item: any) {
    const totalAssigned = item.customers.reduce((sum: number, val: number) => sum + (val || 0), 0);

    // オーバーしてる場合、自動で調整 or 無視（今は無視）
    if (totalAssigned > item.quantity) {
      // 自動補正する例（任意）
      // item.customers = adjustCustomerQuantities(item.customers, item.quantity);

      // もしくは通知だけで戻させる
      alert(`Total quantity for "${item.name}" exceeds limit (${item.quantity}). Please adjust.`);
    }

    this.updateSubtotals();
  }

  // 入力制限用: 残り割当可能な最大数
  getMaxAssignable(item: any, customerIndex: number): number {
    const totalAssigned = item.customers.reduce((sum: number, val: number, idx: number) =>
      idx === customerIndex ? sum : sum + (val || 0), 0);

    return item.quantity - totalAssigned;
  }


  updateSubtotals() {
    const numCustomers = this.numberOfCustomers;
    const items = this.orders[0]?.items || [];

    const rawSubtotals = Array(numCustomers).fill(0);

    // 1. 各人の素の subtotal を計算
    for (let item of items) {
      const sumAssigned = item.customers.reduce((s: number, q: number) => s + (q || 0), 0);
      if (sumAssigned === 0) continue;

      for (let i = 0; i < numCustomers; i++) {
        const assignedQty = item.customers[i] || 0;
        rawSubtotals[i] += item.price * assignedQty;
      }
    }

    // 2. 合計金額を算出
    const totalBeforeService = rawSubtotals.reduce((sum, val) => sum + val, 0);
    const finalTotal = this.orders[0]?.service_charge_10_percent
      ? Math.round(totalBeforeService * 1.1 * 100) / 100
      : Math.round(totalBeforeService * 100) / 100;

    // 3. 各人の割合で分配
    if (this.orders[0]?.service_charge_10_percent) {
      let distributed = 0;
      this.subtotals = rawSubtotals.map((val, i) => {
        const ratio = totalBeforeService === 0 ? 0 : val / totalBeforeService;
        const adjusted = Math.floor(finalTotal * ratio * 100) / 100;
        distributed += adjusted;
        return adjusted;
      });

      // 誤差分を最後の人に加算（誤差補正）
      const diff = Math.round((finalTotal - distributed) * 100) / 100;
      if (numCustomers > 0) this.subtotals[numCustomers - 1] += diff;
    } else {
      // サービス料なし：そのまま丸めるだけ
      this.subtotals = rawSubtotals.map(val => Math.round(val * 100) / 100);
    }
  }


  calcTotal(): number {
    const items: { price: number; quantity: number }[] = this.orders[0]?.items || [];

    const total = items.reduce((sum: number, item: { price: number; quantity: number }) => {
      return sum + item.price * item.quantity;
    }, 0);

    return this.orders[0]?.service_charge_10_percent
      ? Math.round(total * 1.1 * 100) / 100
      : Math.round(total * 100) / 100;
  }

}
