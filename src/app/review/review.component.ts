// review.component.ts
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ImageModule } from 'primeng/image';
import { TableModule } from 'primeng/table';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { log } from 'console';


@Component({
  selector: 'app-review',
  standalone: true,
  imports: [ButtonModule, ImageModule, RouterModule, TableModule, CommonModule, ],
  templateUrl: './review.component.html',
  styleUrls: ['./review.component.css']
})

export class ReviewComponent implements OnInit {
  orders: any[] = [];
  ngOnInit() {
    this.orders = [
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
    ];
  }
}


