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



@Component({
  selector: 'app-review',
  standalone: true,
  imports: [ButtonModule, ImageModule, RouterModule, TableModule, CommonModule, InputTextModule, InputNumberModule, FormsModule, CheckboxModule],
  templateUrl: './review.component.html',
  styleUrls: ['./review.component.css']
})

export class ReviewComponent implements OnInit {
  orders: any[] = [];
  constructor(private http: HttpClient, private orderService: OrderService) {}
  

  ngOnInit() {
    /*this.orders = [
      {
        "items": [
                {
                  "name": "Orange Juice",
                  "quantity": 2,
                  "price": 3.5,
                  "valid": true,
                  "expectedPrice": 3.5
                },
                {
                  "name": "Yasai Chahan",
                  "quantity": 1,
                  "price": 9,
                  "valid": false,
                  "expectedPrice": 9.5
                }
              ],
              "total": 16.5,
              "service_charge_10_percent": false
      }
    ];*/
      this.orders = this.orderService.getOrders();

      if (!this.orders || this.orders.length === 0) {
        console.warn('No order data available!');
      } else {
        console.log('Loaded orders from service:', this.orders);
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
    this.orders[0]?.items.push({
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
    localStorage.setItem('orders', JSON.stringify(this.orders));
    console.log('Saved to localStorage:', this.orders);
  }


}


