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



@Component({
  selector: 'app-review',
  standalone: true,
  imports: [ButtonModule, ImageModule, RouterModule, TableModule, CommonModule, InputTextModule, InputNumberModule, FormsModule],
  templateUrl: './review.component.html',
  styleUrls: ['./review.component.css']
})

export class ReviewComponent implements OnInit {
  orders: any[] = [];
  constructor(private http: HttpClient) {}

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
    this.http.get<any[]>('assets/dummy_order.json').subscribe({
      next: (data) => {
        this.orders = data;
      },
      error: (err) => {
        console.error('Failed to load order data:', err);
      }
    });
  }
  calcTotal(): number {
    const items = this.orders[0]?.items || [];
    return items.reduce((sum: number, item: { price: number; quantity: number }) => {
      return sum + (item.price * item.quantity);
    }, 0);
  }

}


