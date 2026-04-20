import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd, Event } from '@angular/router';
import { HeaderComponent } from './Pages/header/header.component';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  
  showHeader = true;

  constructor(private router: Router) {}

  ngOnInit() {
    // Listen for route changes
    this.router.events.pipe(
      filter((event: Event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      
      // ✅ Check if the URL is a dashboard URL
      if (event.urlAfterRedirects.includes('/dashboard')) {
        this.showHeader = false; // Hide header on Admin/Student dashboard
      } else {
        this.showHeader = true;  // Show header on Home, Login, etc.
      }
      
    });
  }
}