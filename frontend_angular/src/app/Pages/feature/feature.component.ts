import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-feature',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './feature.component.html',
  styleUrls: ['./feature.component.css']
})
export class FeatureComponent {

  features = [
    {
      title: 'Secure Exam Environment',
      description: 'Fullscreen enforcement, tab switch detection, and restricted copy-paste.',
      icon: 'bi bi-lock-fill'
    },
    {
      title: 'AI-Powered Proctoring',
      description: 'Advanced face recognition and real-time eye-tracking to prevent cheating.',
      icon: 'bi bi-eye-fill'
    },
    {
      title: 'Role-Based Access',
      description: 'Separate logins for students, faculty, and institutions.',
      icon: 'bi bi-people-fill'
    },
    {
      title: 'Question Bank & Auto-Grading',
      description: 'MCQs, coding, and essay-based answers with instant grading.',
      icon: 'bi bi-journal-text'
    },
    {
      title: 'Institution Branding',
      description: 'Custom logos, themes, and subdomain authentication.',
      icon: 'bi bi-building'
    },
    {
      title: 'Live Exam Monitoring',
      description: 'Real-time monitoring with cheating detection alerts.',
      icon: 'bi bi-camera-video'
    }
  ];

  showMore() {
    Swal.fire({
      title: 'More Features Coming Soon!',
      text: 'We are continuously adding new capabilities to enhance your experience.',
      icon: 'info',
      confirmButtonText: 'Okay'
    });
  }
}
