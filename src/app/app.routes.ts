import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { ReceiveBouquetComponent } from './receive-bouquet/receive-bouquet.component';
import { ViewBouquetComponent } from './view-bouquet/view-bouquet';
import { CreateBouquetComponent } from './create-bouquet/create-bouquet';

export const routes: Routes = [
    { path: '', redirectTo: 'home', pathMatch: 'full' },
    { path: 'home', component: HomeComponent },
    { path: 'receive', component: ReceiveBouquetComponent },
    { path: 'view-bouquet', component: ViewBouquetComponent },
    { path: 'create', component: CreateBouquetComponent }
];
