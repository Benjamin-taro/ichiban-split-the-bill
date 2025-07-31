import { Component, OnInit, AfterViewInit, inject, PLATFORM_ID } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ImageModule } from 'primeng/image';
import { TableModule } from 'primeng/table';
import { HttpClient } from '@angular/common/http';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../shared/order.service';
import { CheckboxModule } from 'primeng/checkbox';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

type LineItem = {
  id?: string;
  name: string;
  quantity: number;
  price: number;       // 単価（編集可）
  subtotal?: number;   // 小計（編集可：編集時は→ price = subtotal / qty）
  expectedPrice?: number;
  expectedSubtotal?: number;
  valid?: boolean;
  manualEdited?: boolean;
};

type Order = {
  items: LineItem[];
  total?: number;
  service_charge_10_percent: boolean;
};

@Component({
  selector: 'app-review',
  standalone: true,
  imports: [
    ButtonModule, ImageModule, RouterModule, TableModule, CommonModule,
    InputTextModule, InputNumberModule, FormsModule, CheckboxModule
  ],
  templateUrl: './review.component.html',
  styleUrls: ['./review.component.css']
})
export class ReviewComponent implements OnInit, AfterViewInit {
  orders: Order[] = [];
  private menuMap = new Map<string, number>();

  // SSR / 初期レンダー制御
  private platformId = inject(PLATFORM_ID);
  isBrowser = isPlatformBrowser(this.platformId);
  private hydrated = false;

  constructor(private http: HttpClient, private orderService: OrderService) {}

  ngOnInit() {
    // ①（任意）あなたの1回リロードハックはブラウザのみで実行
    if (this.isBrowser) {
      const reloaded = localStorage.getItem('review-page-reloaded');
      if (!reloaded) {
        localStorage.setItem('review-page-reloaded', 'true');
        location.reload();
        return;
      }
    }

    // ② Order の初期化
    const fromSvc = this.orderService.getOrders() as Order[] | undefined;
    this.orders = (fromSvc && fromSvc.length ? fromSvc : [{
      items: [],
      total: 0,
      service_charge_10_percent: false
    }]);

    if (this.orders[0].service_charge_10_percent === undefined) {
      this.orders[0].service_charge_10_percent = false;
    }

    // ③ 旧スキーマ → 「小計中心」のスキーマに移行
    this.migrateItemsSchema();

    // ④ menu.json 読み込み → 起動時は期待値だけ更新（実値は上書きしない）
    this.loadMenuJson(/*preferAssetsOnServer*/ !this.isBrowser).then(() => {
      this.updatePricesFromMenu(true);
    });
  }

  ngAfterViewInit() {
    // 初期レンダーで PrimeNG の ngModelChange が飛ぶのを避ける
    setTimeout(() => { this.hydrated = true; }, 0);
  }

  // ──────── Utils ────────
  private normalize(s: any): string {
    return String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  }
  private round2(x: number): number {
    return Math.round((Number(x) + Number.EPSILON) * 100) / 100;
  }

  // 既存データを「小計中心」に移行：OCRの price は小計とみなす
  private migrateItemsSchema(): void {
    const items = this.orders[0]?.items ?? [];
    for (const it of items) {
      if (typeof it?.quantity !== 'number' || it.quantity < 1) it.quantity = 1;

      if (typeof it?.subtotal !== 'number') {
        // 旧データ：price をレシート小計として扱う
        if (typeof it?.price === 'number') {
          it.subtotal = this.round2(it.price);
          it.price = this.round2(it.subtotal / it.quantity);
        } else {
          it.subtotal = 0;
          it.price = 0;
        }
      } else {
        if (typeof it?.price !== 'number' || isNaN(it.price)) {
          it.price = this.round2(it.subtotal / it.quantity);
        }
      }

      // 期待値フィールドの初期化
      if (typeof it.expectedPrice !== 'number') it.expectedPrice = undefined;
      if (typeof it.expectedSubtotal !== 'number') it.expectedSubtotal = undefined;
    }
    this.saveToLocalStorage();
  }

  private async loadMenuJson(preferAssetsOnServer = false): Promise<void> {
    let mapping: Record<string, number> | null = null;
    try {
      if (preferAssetsOnServer) {
        mapping = await firstValueFrom(this.http.get<Record<string, number>>('assets/menu.json'));
      } else {
        const url = `${environment.apiBaseUrl}/menu.json`;
        mapping = await firstValueFrom(this.http.get<Record<string, number>>(url));
      }
    } catch (e) {
      console.warn('[menu] API取得失敗、assets/menu.jsonへフォールバック', e);
      try {
        mapping = await firstValueFrom(this.http.get<Record<string, number>>('assets/menu.json'));
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

  // 起動時 or 任意タイミングで「期待値だけ」更新
  private updatePricesFromMenu(commit: boolean): void {
    const items = this.orders[0]?.items ?? [];
    for (const it of items) this.applyMenuPrice(it, commit);
    this.saveToLocalStorage();
  }

  // Item名編集時に呼ぶ（commit = true）
  updatePriceForItem(index: number): void {
    const it = this.orders[0]?.items?.[index];
    if (!it) return;
    this.applyMenuPrice(it, true);   // ← 実値に反映（price のみ）
    this.saveToLocalStorage();
  }

  /**
   * menu.json の反映
   * commit=false: 期待値のみ更新
   * commit=true : 実値（price のみ）も更新。subtotal は触らない（レシートを尊重）
   */
  private applyMenuPrice(it: LineItem, commit = false) {
    const key = this.normalize(it.name);
    const menuPrice = this.menuMap.get(key);

    if (menuPrice !== undefined) {
      it.valid = true;
      it.expectedPrice = this.round2(menuPrice);
      // 必要なら expectedSubtotal も運用
      // it.expectedSubtotal = this.round2((it.quantity || 1) * menuPrice);

      if (commit) {
        it.price = this.round2(menuPrice); // 単価のみ更新
        it.subtotal = this.round2(it.price * (it.quantity || 1)); // 小計は qty に応じて更新
      }
    } else {
      it.valid = false;
      it.expectedPrice = undefined;
      it.expectedSubtotal = undefined;
    }
  }

  // ──────── 編集ハンドラ（初期レンダーは無視） ────────
  onUnitPriceChange(index: number): void {
    if (!this.hydrated) return;
    const it = this.orders[0]?.items?.[index];
    if (!it) return;
    it.quantity = Math.max(1, Number(it.quantity) || 1);
    it.price = Number(it.price) || 0;
    it.subtotal = this.round2(it.price * it.quantity);
    it.manualEdited = true;
    this.saveToLocalStorage();
  }

  onSubtotalChange(index: number): void {
    if (!this.hydrated) return;
    const it = this.orders[0]?.items?.[index];
    if (!it) return;
    it.quantity = Math.max(1, Number(it.quantity) || 1);
    it.subtotal = Number(it.subtotal) || 0;
    it.price = this.round2(it.subtotal / it.quantity);
    it.manualEdited = true;
    this.saveToLocalStorage();
  }

  onQuantityChange(index: number): void {
    if (!this.hydrated) return;
    const it = this.orders[0]?.items?.[index];
    if (!it) return;
    it.quantity = Math.max(1, Number(it.quantity) || 1);
    it.price = Number(it.price) || 0;
    it.subtotal = this.round2(it.price * it.quantity);
    if (typeof it.expectedPrice === 'number') {
      it.expectedSubtotal = this.round2(it.expectedPrice * it.quantity);
    }
    this.saveToLocalStorage();
  }

  // 合計は「subtotal の合計」を優先（なければ price*qty をフォールバック）
  calcTotal(): number {
    const items = this.orders[0]?.items ?? [];
    const sum = items.reduce((acc, it) => {
      const sub = (typeof it.subtotal === 'number')
        ? it.subtotal
        : (Number(it.price) || 0) * (Number(it.quantity) || 0);
      return acc + sub;
    }, 0);
    const total = this.round2(sum);
    return this.orders[0]?.service_charge_10_percent ? this.round2(total * 1.1) : total;
  }

  addRow() {
    if (!this.orders || this.orders.length === 0) {
      this.orders = [{ items: [], total: 0, service_charge_10_percent: false }];
    }
    this.orders[0].items.push({
      name: 'hello ichiban!!',
      quantity: 1,
      price: 0,
      subtotal: 0,
      valid: true,
      expectedPrice: undefined,
      expectedSubtotal: undefined
    });
    this.saveToLocalStorage();
  }

  removeRow(index: number) {
    this.orders[0]?.items.splice(index, 1);
    this.saveToLocalStorage();
  }

  saveToLocalStorage() {
    if (this.isBrowser) {
      localStorage.setItem('orders', JSON.stringify(this.orders));
      // console.debug('Saved to localStorage:', this.orders);
    }
  }
}
