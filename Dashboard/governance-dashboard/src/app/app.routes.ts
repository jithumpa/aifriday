import { Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { DataIngestionComponent } from './pages/data-ingestion/data-ingestion.component';
import { BriefComponent } from './pages/brief/brief.component';
import { ChatComponent } from './pages/chat/chat.component';
import { InitiativesComponent } from './pages/initiatives/initiatives.component';

export const routes: Routes = [
    { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    { path: 'dashboard', component: DashboardComponent },
    { path: 'data', component: DataIngestionComponent },
    { path: 'brief', component: BriefComponent },
    { path: 'chat', component: ChatComponent },
    { path: 'initiatives', component: InitiativesComponent },
    { path: '**', redirectTo: 'dashboard' }
];
