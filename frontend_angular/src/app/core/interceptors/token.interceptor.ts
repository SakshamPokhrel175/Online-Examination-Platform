// src/app/core/interceptors/token.interceptor.ts
import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor
} from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class TokenInterceptor implements HttpInterceptor {

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    const url = req.url;

    // ----------------------------------------------
    // Skip token ONLY for login + register
    // ----------------------------------------------
    const isAuthRequest =
      url.includes('/api/auth/login') ||
      url.includes('/api/auth/register');

    if (isAuthRequest) {
      return next.handle(req);
    }

    // ----------------------------------------------
    // Attach token for ALL other API requests
    // ----------------------------------------------
    const token = localStorage.getItem('token');

    if (token) {
      const cloned = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
      return next.handle(cloned);
    }

    return next.handle(req);
  }
}
