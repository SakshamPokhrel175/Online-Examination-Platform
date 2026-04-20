// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    loadComponent: () =>
      import('./Pages/home/home.component').then((m) => m.HomeComponent),
  },

  // --- AUTH ROUTES ---
  {
    path: 'auth/general',
    loadComponent: () =>
      import(
        './Pages/auth/general-users/general-auth/general-auth.component'
      ).then((m) => m.GeneralAuthComponent),
  },
  {
    path: 'auth/student',
    loadComponent: () =>
      import(
        './Pages/auth/institution-users/student-auth/student-auth.component'
      ).then((m) => m.StudentAuthComponent),
  },
  {
    path: 'auth/faculty',
    loadComponent: () =>
      import(
        './Pages/auth/institution-users/faculty-auth/faculty-auth.component'
      ).then((m) => m.FacultyAuthComponent),
  },
  {
    path: 'auth/admin',
    loadComponent: () =>
      import('./Pages/auth/admin-users/admin-auth/admin-auth.component').then(
        (m) => m.AdminAuthComponent
      ),
  },

  // --- PROTECTED DASHBOARDS ---
  {
    path: 'dashboard/general',
    loadComponent: () =>
      import(
        './Pages/dashboard/general-dashboard/general-dashboard.component'
      ).then((m) => m.GeneralDashboardComponent),
    canActivate: [authGuard],
  },
  {
    path: 'dashboard/admin',
    loadComponent: () =>
      import(
        './Pages/dashboard/admin-dashboard/admin-dashboard.component'
      ).then((m) => m.AdminDashboardComponent),
    canActivate: [authGuard],
  },
  {
    path: 'dashboard/teacher',
    loadComponent: () =>
      import(
        './Pages/dashboard/teacher-dashboard/teacher-dashboard.component'
      ).then((m) => m.TeacherDashboardComponent),
    canActivate: [authGuard],
  },
  // ✅ ADDED: Student Dashboard
  {
    path: 'dashboard/student',
    loadComponent: () =>
      import(
        './Pages/dashboard/student-dashboard/student-dashboard.component'
      ).then((m) => m.StudentDashboardComponent),
    canActivate: [authGuard],
  },

  // --- QUIZ ROUTES ---
  {
    path: 'quiz-builder/:id',
    loadComponent: () =>
      import(
        './Pages/dashboard/general-dashboard/quiz-builder/quiz-builder.component'
      ).then((m) => m.QuizBuilderComponent),
    canActivate: [authGuard],
  },
  {
    path: 'play/:code',
    loadComponent: () =>
      import('./Pages/play-quiz/play-quiz.component').then(
        (m) => m.PlayQuizComponent
      ),
    canActivate: [authGuard],
  },

  // --- OTHER PAGES ---
  {
    path: 'manage',
    loadComponent: () =>
      import('./Pages/auth/institutions/institutions.component').then(
        (m) => m.InstitutionsComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: 'proctor-review',
    loadComponent: () =>
      import('./Pages/proctor-review/proctor-review.component').then(
        (m) => m.ProctorReviewComponent
      ),
  },

  {
    path: 'features',
    loadComponent: () =>
      import('./Pages/feature/feature.component').then(
        (m) => m.FeatureComponent
      ),
  },
  {
    path: 'plans',
    loadComponent: () =>
      import('./Pages/plan/plan.component').then((m) => m.PlanComponent),
  },
  {
    path: 'testimonials',
    loadComponent: () =>
      import('./Pages/testimonial/testimonial.component').then(
        (m) => m.TestimonialComponent
      ),
  },
  {
    path: 'help',
    loadComponent: () =>
      import('./Pages/help/help.component').then((m) => m.HelpComponent),
  },
  {
    path: 'remote-proctoring',
    loadComponent: () =>
      import('./Pages/remote-proctoring/remote-proctoring.component').then(
        (m) => m.RemoteProctoringComponent
      ),
  },



// --- POOL (LIVE QUIZ) ROUTES ---
{
  path: 'pool',
  loadComponent: () =>
    import('./Pages/pool/pool/pool.component').then(
      (m) => m.PoolComponent
    ),
},
{
  path: 'pool/dashboard',
  canActivate: [authGuard],
  loadComponent: () =>
    import('./Pages/pool/pool-dashboard/pool-dashboard.component')
      .then(m => m.PoolDashboardComponent),
},
{
  path: 'pool/auth',
  loadComponent: () =>
    import('./Pages/pool/pool-auth/pool-auth/pool-auth.component').then(
      (m) => m.PoolAuthComponent
    ),
},
{
  path: 'pool/join',
  loadComponent: () =>
    import('./Pages/pool/pool-join/pool-join.component').then(
      (m) => m.PoolJoinComponent
    ),
},
{
  path: 'pool/host',
  canActivate: [authGuard],
  loadComponent: () =>
    import('./Pages/pool/pool-host/pool-host.component').then(
      (m) => m.PoolHostComponent
    ),
},
{
  path: 'pool/play',
  loadComponent: () =>
    import('./Pages/pool/pool-play/pool-play.component').then(
      (m) => m.PoolPlayComponent
    ),
},
{
  path: 'pool/scoreboard',
  loadComponent: () =>
    import('./Pages/pool/pool-scoreboard/pool-scoreboard.component').then(
      (m) => m.PoolScoreboardComponent
    ),
},




];
