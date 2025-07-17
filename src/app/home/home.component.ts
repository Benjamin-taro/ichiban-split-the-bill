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

@Component({
    selector: 'app-home',
    standalone: true,
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css'],
    imports: [ButtonModule, RouterModule, FileUploadModule, ImageModule, SkeletonModule, CommonModule],
})
export class HomeComponent {
    private router = inject(Router);
    loading = false;
    uploadedImageUrl: string | undefined = undefined;
    SelectedFile: File | null = null;
    http = inject(HttpClient);


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
        if (!this.SelectedFile) return;
        const formData = new FormData();
        formData.append('file', this.SelectedFile);
        this.loading = true;

        this.http.post<{ imageUrl: string }>('https://your-api.com/upload', formData)
        .subscribe({
            next: res => {
            this.uploadedImageUrl = res.imageUrl;
            this.loading = false;
            /** ← アップロード成功後に review へ */
            this.router.navigate(['/review']);
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
        this.router.navigate(['/review']).then(success => {
            console.log('Navigation result:', success);
        });
    }

}


