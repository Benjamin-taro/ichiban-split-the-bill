import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { FileUploadModule } from 'primeng/fileupload';
import { ImageModule } from 'primeng/image';
import { SkeletonModule } from 'primeng/skeleton';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { OrderService } from '../shared/order.service';

@Component({
    selector: 'app-home',
    standalone: true,
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css'],
    imports: [ButtonModule, RouterModule, FileUploadModule, ImageModule, SkeletonModule, CommonModule],
})
export class HomeComponent {
    private router = inject(Router);
    private http = inject(HttpClient);
    loading = false;
    uploadedImageUrl: string | undefined = undefined;
    SelectedFile: File | null = null;

    constructor(private orderService: OrderService) {}

  onSelect(event: any) {
    this.loading = true;
    const file = event.files?.[0];

    if (file) {
      this.SelectedFile = file;
      
      const reader = new FileReader();
      reader.onload = () => {
        this.uploadedImageUrl = reader.result as string;
        this.loading = false;
      };
      reader.readAsDataURL(file);
    }
  }

    onUpload(event: any) {
        console.log('Upload triggered. SelectedFile:', this.SelectedFile);

        if (!this.SelectedFile) {
            console.warn('No file selected!');
            return;
        }
        
        const formData = new FormData();
        formData.append('file', this.SelectedFile);
        this.loading = true;

        this.http.post<any>('https://receipt-splitter-backend-xncr.onrender.com/extract', formData)
            .subscribe({
                next: res => {
                    this.orderService.setOrders([res]);
                    console.log('Server response:', res);
                    this.loading = false;
                    setTimeout(() => {
                        this.router.navigate(['/review']);
                    }, 10000); 
                },
                error: err => {
                    console.error('Upload failed', err);
                    this.loading = false;
                }
            });
    }

    // home.component.ts に追加
    uploadManually() {
        this.onUpload(null);  // 明示的に手動で呼び出す
        /*
        this.router.navigate(['/review']).then(success => {
            console.log('Navigation result:', success);
        });
        */
    }

}


