// review.component.ts
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ImageModule } from 'primeng/image';
import { TableModule } from 'primeng/table';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { log } from 'console';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../shared/order.service';
import { CheckboxModule } from 'primeng/checkbox';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment'; // 環境変数のインポート



@Component({
  selector: 'app-review',
  standalone: true,
  imports: [ButtonModule, ImageModule, RouterModule, TableModule, CommonModule, InputTextModule, InputNumberModule, FormsModule, CheckboxModule],
  templateUrl: './review.component.html',
  styleUrls: ['./review.component.css']
})

export class ReviewComponent implements OnInit {
  orders: any[] = [];
  private menuMap = new Map<string, number>();
  constructor(private http: HttpClient, private orderService: OrderService) {}
  checked: boolean = false;

  ngOnInit() {
      if (typeof window !== 'undefined') {
        const reloaded = localStorage.getItem('review-page-reloaded');
        if (!reloaded) {
          localStorage.setItem('review-page-reloaded', 'true');
          location.reload(); // 強制リロード
          return; // ここで止めておく
        }
      }
      this.orders = this.orderService.getOrders();
      if (!this.orders || this.orders.length === 0) {
        this.orders = [{
          items: [],
          total: 0,
          service_charge_10_percent: false
        }];
      } else if (this.orders[0].service_charge_10_percent === undefined) {
        this.orders[0].service_charge_10_percent = false;
      }

      this.loadMenuJson().then(() => {
          this.updatePricesFromMenu();
      });

      if (!this.orders || this.orders.length === 0) {
        console.warn('No order data available!');
      } else {
        console.log('Loaded orders from service:', this.orders);
      }
  }
  private normalize(s: any): string {
    return String(s ?? '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }

  private async loadMenuJson(): Promise<void> {
    const url = `${environment.apiBaseUrl}/menu.json`;
    let mapping: Record<string, number> | null = null;

    try {
      mapping = await firstValueFrom(
        this.http.get<Record<string, number>>(url)
      );
    } catch (e) {
      console.warn('[menu] API取得に失敗。assets/menu.json にフォールバックします。', e);
      try {
        mapping = await firstValueFrom(
          this.http.get<Record<string, number>>('assets/menu.json')
        );
      } catch (e2) {
        console.error('[menu] フォールバックも失敗', e2);
        mapping = {};
      }
    }

    this.menuMap.clear();
    for (const [k, v] of Object.entries(mapping ?? {})) {
      this.menuMap.set(this.normalize(k), v as number);
    }
  }

// 全件更新（ngOnInit から呼ぶ）
  private updatePricesFromMenu(): void {
    const items = this.orders[0]?.items || [];
    for (const it of items) this.applyMenuPrice(it);
    this.saveToLocalStorage();
  }

  // 1行だけ更新（編集時に呼ぶ）
  updatePriceForItem(index: number): void {
    const it = this.orders[0]?.items?.[index];
    if (!it) return;
    this.applyMenuPrice(it);
    this.saveToLocalStorage();
  }

  // 共通ロジック
  private applyMenuPrice(it: any) {
    const key = this.normalize(it.name);
    const menuPrice = this.menuMap.get(key);
    console.log('[name edit]', it.name, '->', key, 'found:', menuPrice);
    if (menuPrice !== undefined) {
      it.price = menuPrice;
      it.expectedPrice = menuPrice;
      it.valid = true;
    } else {
      it.valid = false;
    }
  }


  calcTotal(): number {
    const items: { price: number; quantity: number }[] = this.orders[0]?.items || [];
    this.saveToLocalStorage();
    const total = items.reduce((sum: number, item: { price: number; quantity: number }) => {
      return sum + item.price * item.quantity;
    }, 0);

    return this.orders[0]?.service_charge_10_percent
      ? Math.round(total * 1.1 * 100) / 100
      : Math.round(total * 100) / 100;
  }



  addRow() {
    if (!this.orders || this.orders.length === 0) {
      this.orders = [{
        items: [],
        total: 0,
        service_charge_10_percent: false
      }];
    }

    this.orders[0].items.push({
      name: 'hello ichiban!!',
      quantity: 1,
      price: 0,
      valid: true,
      expectedPrice: 0
    });
  }


  removeRow(index: number) {
    this.orders[0]?.items.splice(index, 1);
  }

  saveToLocalStorage() {
    if (typeof window !== 'undefined' && localStorage) {
      localStorage.setItem('orders', JSON.stringify(this.orders));
      console.log('Saved to localStorage:', this.orders);
    } else {
      console.warn('localStorage is not available (likely SSR environment)');
    }
  }



}


