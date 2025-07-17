import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { ReviewComponent } from './review/review.component';
import { SplitViewComponent } from './split-view/split-view.component';

export const routes: Routes = [
    {
        path: '',
        component: HomeComponent
    },
    {
        path: 'review',
        component: ReviewComponent
    },
    {
        path: 'split-view',
        component: SplitViewComponent
    }
];
