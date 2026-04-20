// src/app/app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TokenInterceptor } from './core/interceptors/token.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),

    provideHttpClient(
      withInterceptors([ (req, next) => {
          const token = localStorage.getItem('token');
          if (token) {
            const cloned = req.clone({
              setHeaders: { Authorization: `Bearer ${token}` }
            });
            return next(cloned);
          }
          return next(req);
      }])
    )
  ]
};
