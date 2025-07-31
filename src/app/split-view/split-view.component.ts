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
import { DialogModule } from 'primeng/dialog';


@Component({
  selector: 'app-split-view',
  imports: [CommonModule, RouterModule, ButtonModule, InputTextModule, InputNumberModule, FormsModule, TableModule, CheckboxModule, DialogModule],
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

  // --- 追加：割り振りダイアログ用の状態 ---
  allocationDialogVisible = false;
  selectedItemIndex: number | null = null;
  editingCustomers: number[] = []; // ダイアログ内で編集する一時配列
  allocationMode: 'auto' | 'custom' = 'auto';
  selected: boolean[] = []; // 各カスタマーのON/OFF

  // 行クリック：モーダルを開く（既存）
  openAllocation(item: any, index: number) {
    this.selectedItemIndex = index;

    const n = this.numberOfCustomers;
    const current = Array.isArray(item.customers) ? item.customers : [];
    this.editingCustomers = Array.from({ length: n }, (_, i) => Number(current[i]) || 0);

    /* ここだけ修正 */
    this.selected = Array(n).fill(false);
    current.forEach((v: number, i: number) => {   // ★ 型注釈を追加
      if (Number(v) > 0) this.selected[i] = true;
    });

    this.allocationMode = 'auto';
    if (this.selected.some(s => s)) {
      this.recomputeEvenSplit();
    }

    this.allocationDialogVisible = true;
  }


  // モード切替（ボタン/自動）
  setMode(mode: 'auto' | 'custom') {
    this.allocationMode = mode;
    if (mode === 'auto') this.recomputeEvenSplit();
  }

  /** すべて ON（選択） */
  selectAll() {
    const n = this.numberOfCustomers;
    this.selected = Array(n).fill(true);

    if (this.allocationMode === 'auto') {
      // 均等割りを再計算
      this.recomputeEvenSplit();
    } else {
      // custom モードなら保持している数量をそのまま使う
      // まだ 0 の場合はとりあえず 0 のままで OK
    }
  }

  /** すべて OFF（非選択） */
  unselectAll() {
    const n = this.numberOfCustomers;
    this.selected = Array(n).fill(false);
    this.editingCustomers = Array(n).fill(0); // 数量も 0 に

    // auto／custom どちらでも数量は 0 のまま
  }


  // チップ（顧客）のON/OFF
  toggleCustomer(ci: number) {
    this.selected[ci] = !this.selected[ci];
    if (this.allocationMode === 'auto') {
      this.recomputeEvenSplit();
    } else {
      // custom時はOFFにしたらその人の数を0に
      if (!this.selected[ci]) this.editingCustomers[ci] = 0;
    }
  }

  private recomputeEvenSplit() {
    if (this.selectedItemIndex == null) return;
    const row = this.orders[0]?.items?.[this.selectedItemIndex];
    if (!row) return;

    const q = Number(row.quantity) || 0;
    const onIdx = this.selected.map((v, i) => v ? i : -1).filter(i => i >= 0);
    if (q <= 0 || onIdx.length === 0) {
      this.editingCustomers.fill(0);
      return;
    }

    // 小数点2桁で均等割り
    const raw = q / onIdx.length;                // e.g. 2 / 4 = 0.5
    const even = Math.floor(raw * 100) / 100;    // 0.5 を 2桁固定
    const totalEven = even * onIdx.length;
    let diff = Math.round((q - totalEven) * 100) / 100; // 誤差（0〜0.99）

    // 反映
    this.editingCustomers.fill(0);
    onIdx.forEach(i => {
      this.editingCustomers[i] = even;
      if (diff > 0) {
        // 0.01 ずつ余りを配分
        const add = Math.min(diff, 0.01);
        this.editingCustomers[i] = Math.round((even + add) * 100) / 100;
        diff = Math.round((diff - add) * 100) / 100;
      }
    });
  }


  // 入力を手で変えたら custom に移行＆上限を守る
  onDialogInputChange(ci: number) {
    this.allocationMode = 'custom';
    if (this.selectedItemIndex == null) return;
    const row = this.orders[0]?.items?.[this.selectedItemIndex];
    if (!row) return;

    // 入力が0ならOFF、>0ならON
    const v = Number(this.editingCustomers[ci]) || 0;
    this.selected[ci] = v > 0;

    // 合計超過を抑止
    const others = this.editingCustomers.reduce((s, val, idx) => s + (idx === ci ? 0 : (Number(val) || 0)), 0);
    const maxForCi = Math.max(0, (Number(row.quantity) || 0) - others);
    if (v > maxForCi) this.editingCustomers[ci] = maxForCi;
  }


  // 保存：行データに反映して再計算
  saveAllocation() {
    if (this.selectedItemIndex == null) return;
    const row = this.orders[0]?.items?.[this.selectedItemIndex];
    if (!row) return;

    // 合計が quantity を超えないようにバリデーション
    const sum = this.editingCustomers.reduce((s, v) => s + (Number(v) || 0), 0);
    if (sum > row.quantity) {
      alert(`Assigned total (${sum}) exceeds quantity (${row.quantity}).`);
      return;
    }

    row.customers = [...this.editingCustomers];

    // 既存の再計算ロジックを呼ぶ
    this.handleQuantityChange(row);
    this.updateSubtotals();

    this.allocationDialogVisible = false;
    this.selectedItemIndex = null;
  }

  // 取消
  cancelAllocation() {
    this.allocationDialogVisible = false;
    this.selectedItemIndex = null;
  }

  // （任意）ダイアログ内でも max を出したい場合のヘルパー
  getMaxAssignableForDialog(ci: number): number {
    if (this.selectedItemIndex == null) return 9999;
    const row = this.orders[0]?.items?.[this.selectedItemIndex];
    if (!row) return 9999;

    const others = this.editingCustomers.reduce(
      (s: number, v: number, idx: number) => s + (idx === ci ? 0 : (Number(v) || 0)),
      0   // ★ これで s の型が number と確定
    );
    return row.quantity - others;
  }

  
  
  constructor(private orderService: OrderService) {}
  
  ngOnInit() {
    if (typeof window !== 'undefined' && localStorage) {
      const savedOrders = localStorage.getItem('orders');
      if (savedOrders) {
        this.orders = JSON.parse(savedOrders);
        console.log('Loaded orders from localStorage:', this.orders);
      } else {
        this.orders = this.orderService.getOrders();  // フォールバック
        console.warn('No localStorage orders found, falling back to service.');
      }
    } else {
      // SSR / Vite で localStorage がないとき
      this.orders = this.orderService.getOrders();
      console.warn('localStorage is not available, fallback to service.');
    }

    this.updateCustomerColumns();
  }

  rowClass = (row: any): string => {
    if (!Array.isArray(row.customers)) return 'unallocated';

    const sum = row.customers.reduce(
      (sum: number, val: number) => sum + (Number(val) || 0),
      0        // ★ 初期値を追加
    );
    const qty = Number(row.quantity) || 0;

    if (sum === 0)  return 'unallocated';
    if (sum < qty)  return 'partial';
    if (sum === qty) return '';
    return 'over';
  };

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
