// src/app/core/guards/auth.guard.ts
import {
  CanActivateFn,
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree
} from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/AuthService/auth.service';
import { QuizService } from '../services/QuizService/quiz.service';
import { map, catchError } from 'rxjs/operators';
import { Observable, of } from 'rxjs';

export const authGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): Observable<boolean | UrlTree> | boolean | UrlTree => {

  const authService = inject(AuthService);
  const router = inject(Router);
  const quizService = inject(QuizService);

  const returnUrl = state.url;
  const currentUser = authService.getCurrentUser();

  // ==============================
  // 🟣 POOL ROUTES (ISOLATED)
  // ==============================
  if (state.url.startsWith('/pool')) {

    // Not logged in → pool login
    if (!authService.isLoggedIn()) {
      return router.createUrlTree(
        ['/pool/auth'],
        { queryParams: { returnUrl } }
      );
    }

    // Logged in but wrong user type
    if (currentUser?.userType !== 'POOL') {
      return router.createUrlTree(['/home']);
    }

    // ✅ Pool host allowed
    return true;
  }

  // ==============================
  // 🎮 QUIZ PLAY FLOW
  // ==============================
 // ==============================
// 🎮 QUIZ PLAY FLOW
// ==============================
if (state.url.includes('/play/')) {

  // If already logged in → allow
  if (authService.isLoggedIn()) {
    return true;
  }

  const quizCode = route.paramMap.get('code');

  if (!quizCode) {
    return router.createUrlTree(['/home']);
  }

  return quizService.getQuizCreatorTypeByCode(quizCode).pipe(
    map(creatorTypeRaw => {
      const creatorType =
        (creatorTypeRaw || '').toString().trim().toLowerCase();

      if (creatorType === 'general') {
        return router.createUrlTree(
          ['/auth/general'],
          { queryParams: { returnUrl } }
        );
      }

      return router.createUrlTree(
        ['/auth/student'],
        { queryParams: { returnUrl } }
      );
    }),
    catchError(() =>
      of(
        router.createUrlTree(
          ['/auth/general'],
          { queryParams: { returnUrl } }
        )
      )
    )
  );
}


  // ==============================
  // 🔒 NORMAL AUTH
  // ==============================
  if (!authService.isLoggedIn()) {
    return router.createUrlTree(
      ['/auth/general'],
      { queryParams: { returnUrl } }
    );
  }

  return true;
};



// // src/app/core/guards/auth.guard.ts
// import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
// import { inject } from '@angular/core';
// import { AuthService } from '../services/AuthService/auth.service';
// import { QuizService } from '../services/QuizService/quiz.service';
// import { map, catchError } from 'rxjs/operators';
// import { Observable, of } from 'rxjs';

// export const authGuard: CanActivateFn = (
//   route: ActivatedRouteSnapshot,
//   state: RouterStateSnapshot
// ): Observable<boolean | UrlTree> | boolean | UrlTree => {
//   const authService = inject(AuthService);
//   const router = inject(Router);
//   const quizService = inject(QuizService);

//   // If already logged in -> allow
//   if (authService.isLoggedIn()) {
//     return true;
//   }

//   const returnUrl = state.url;

//   // Special flow for play links
//   if (state.url.includes('/play/')) {
//     const quizCode = route.paramMap.get('code');

//     if (!quizCode) {
//       return router.createUrlTree(['/home']);
//     }

//     // Normalize value and route:
//     //  - 'general' => /auth/general
//     //  - anything else (faculty/institute/teacher/unknown) => /auth/student
//     return quizService.getQuizCreatorTypeByCode(quizCode).pipe(
//       map(creatorTypeRaw => {
//         console.log('authGuard: creatorTypeRaw for code', quizCode, '=', creatorTypeRaw);

//         const creatorType = (creatorTypeRaw || '').toString().trim().toLowerCase();

//         if (creatorType === 'general') {
//           return router.createUrlTree(['/auth/general'], { queryParams: { returnUrl } });
//         }

//         // All other values -> student login (faculty/institute/unknown)
//         return router.createUrlTree(['/auth/student'], { queryParams: { returnUrl } });
//       }),
//       catchError(err => {
//         console.error('authGuard: error while getting quiz creator type', err);
//         // If the backend call fails, fallback to student (safer for institute-created quizzes)
//         return of(router.createUrlTree(['/auth/student'], { queryParams: { returnUrl } }));
//       })
//     );
//   }

//   // Default: require auth, redirect to general login
//   return router.createUrlTree(['/auth/general'], { queryParams: { returnUrl } });
// };


