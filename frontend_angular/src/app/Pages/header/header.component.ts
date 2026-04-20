// src/app/Pages/header/header.component.ts
import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/AuthService/auth.service';
import { jwtDecode } from 'jwt-decode';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLinkActive, RouterLink, CommonModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {
  isLoggedIn = false;
  dashboardPath: string = '/dashboard/general';
  isQuizLockedView = false;

  // to detect transitions (login/logout)
  private lastLoginState = false;

  // store pending scroll id when navigating to /home first
  private pendingScrollId: string | null = null;

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    // Observe login state and react with SweetAlert toasts
    this.auth.isLoggedIn$.subscribe((status) => {
      this.isLoggedIn = status;

      // Set dashboard path based on role if logged in
      if (status) {
        this.checkUserRole();
      } else {
        this.dashboardPath = '/home';
      }

      // Detect transitions: show small toast on login/logout
      if (!this.lastLoginState && status) {
        // just logged in
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Successfully signed in',
          showConfirmButton: false,
          timer: 1400,
          timerProgressBar: true
        });
      } else if (this.lastLoginState && !status) {
        // just logged out
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'info',
          title: 'You have been signed out',
          showConfirmButton: false,
          timer: 1200
        });
      }

      this.lastLoginState = status;
    });

    // Router events: handle pending scrolls and track quiz-play route
    this.router.events.subscribe((ev) => {
      if (ev instanceof NavigationEnd) {
        // If navigation completed and we had a pending section, scroll to it
        if (this.pendingScrollId) {
          setTimeout(() => {
            this.scrollToElement(this.pendingScrollId!);
            this.pendingScrollId = null;
          }, 60);
        }
      }

      // Track whether the current URL is a quiz-play view
      try {
        this.isQuizLockedView = this.router.url.includes('/play/');
      } catch {
        this.isQuizLockedView = false;
      }
    });
  }

  /**
   * Determine user's primary role from JWT and set dashboardPath accordingly.
   */
  checkUserRole(): void {
    const token = this.auth.getToken();
    if (!token) {
      this.dashboardPath = '/home';
      return;
    }

    try {
      const decodedToken: any = jwtDecode(token);
      const roles: string[] = decodedToken.roles || [];

      if (roles.includes('ADMIN')) {
        this.dashboardPath = '/dashboard/admin';
      } else if (roles.includes('TEACHER')) {
        this.dashboardPath = '/dashboard/teacher';
      } else if (roles.includes('STUDENT')) {
        this.dashboardPath = '/dashboard/student';
      }else if((roles.includes('POOL_USER'))){
        this.dashboardPath = '/pool/dashboard';
      }else {
        this.dashboardPath = '/dashboard/general';
      }
    } catch (e) {
      console.error('Error decoding token for role:', e);
      this.dashboardPath = '/dashboard/general';
    }
  }

  /**
   * Confirm logout with SweetAlert2 and perform logout if confirmed.
   */
  onLogout(): void {
    Swal.fire({
      title: 'Are you sure?',
      text: 'Do you want to sign out of QuizVerse?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, sign out',
      cancelButtonText: 'Cancel',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        try {
          this.auth.logout();
          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Signed out',
            showConfirmButton: false,
            timer: 1000
          });
        } catch (e) {
          console.error('Logout error', e);
          Swal.fire({ icon: 'error', title: 'Logout failed', text: 'See console for details.' });
        } finally {
          setTimeout(() => this.router.navigate(['/home']), 400);
        }
      }
    });
  }

  /**
   * Navigate to /home (if needed) and then scroll to the section ID.
   * If already on /home, scroll immediately.
   */
  navigateToSection(id: string): void {
    // Close mobile navbar first
    this.closeNavbar();

    const sectionId = id;

    // If already on home, scroll immediately
    const current = this.router.url.split('?')[0].split('#')[0];
    if (current === '/home' || current === '' || current === '/') {
      // give a tiny delay for layout to stabilize
      setTimeout(() => this.scrollToElement(sectionId), 50);
      return;
    }

    // Otherwise navigate to /home and remember to scroll after navigation completes
    this.pendingScrollId = sectionId;
    this.router.navigate(['/home']).catch((err) => {
      console.error('Navigation to /home failed:', err);
      // fallback: try scrolling after a short delay even if navigation failed
      setTimeout(() => this.scrollToElement(sectionId), 120);
    });
  }

  /**
   * Smoothly scroll to the element with the provided id, accounting for sticky navbar height.
   */
  private scrollToElement(id: string): void {
    const el = document.getElementById(id);
    if (!el) return;

    // account for sticky navbar height
    const navbar = document.querySelector('.navbar') as HTMLElement | null;
    const navbarHeight = navbar ? navbar.offsetHeight : 0;
    const extraOffset = 12;

    const rect = el.getBoundingClientRect();
    const targetY = rect.top + window.scrollY - navbarHeight - extraOffset;

    window.scrollTo({
      top: Math.max(0, Math.floor(targetY)),
      behavior: 'smooth'
    });
  }

  /**
   * Close the collapsed navbar (mobile). Uses Bootstrap collapse API if available for a smooth close.
   */
  closeNavbar(): void {
    try {
      const collapseEl = document.getElementById('mainNavbar');
      if (!collapseEl) return;

      if (collapseEl.classList.contains('show')) {
        // Prefer using Bootstrap's Collapse API if present (animated hide)
        const bsCollapseCtor = (window as any).bootstrap?.Collapse;
        if (bsCollapseCtor) {
          const instance = bsCollapseCtor.getInstance
            ? bsCollapseCtor.getInstance(collapseEl)
            : null;
          if (instance) {
            instance.hide();
          } else {
            // create an instance and hide
            const created = new bsCollapseCtor(collapseEl);
            created.hide();
          }
        } else {
          // Fallback: remove class and update toggler aria attribute
          collapseEl.classList.remove('show');
          const toggler = document.querySelector('.navbar-toggler') as HTMLElement | null;
          if (toggler) toggler.setAttribute('aria-expanded', 'false');
        }
      }
    } catch (e) {
      console.error('closeNavbar error', e);
    }
  }
  
}
