/// <reference types="@angular/localize" />

(window as any).global = window; // ✅ REQUIRED for STOMP + SockJS

import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig).catch((err) =>
  console.error(err)


);
