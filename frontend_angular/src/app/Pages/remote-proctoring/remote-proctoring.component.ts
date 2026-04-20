import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-remote-proctoring',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './remote-proctoring.component.html',
  styleUrls: ['./remote-proctoring.component.css']
})
export class RemoteProctoringComponent {
  features = [
    {
      title: 'Secure Login with JWT & OAuth',
      description: 'Robust access control using JWT & OAuth protocols. Ensures seamless login with strong encryption for individuals and institutions.',
      image: 'https://plus.unsplash.com/premium_photo-1681487746049-c39357159f69?q=80&w=2070&auto=format&fit=crop'
    },
    {
      title: 'Face & Eye Tracking Authentication',
      description: 'Biometric verification with real-time facial and eye detection to prevent impersonation and ensure candidate authenticity.',
      image: 'https://plus.unsplash.com/premium_photo-1734171012738-0e4781a57b12?q=80&w=1932&auto=format&fit=crop'
    },
    {
      title: 'Role-Based Quiz Creation',
      description: 'Faculty enjoy structured control with role-based quiz management.',
      image: 'https://images.unsplash.com/photo-1505238680356-667803448bb6?q=80&w=2070&auto=format&fit=crop'
    },
    {
      title: 'Real-Time Video Monitoring',
      description: 'AI & human proctors monitor candidates live to detect suspicious behavior.',
      image: 'https://images.unsplash.com/photo-1614588876378-b2ffa4520c22?q=80&w=2060&auto=format&fit=crop'
    },
    {
      title: 'Auto Evaluation & Instant Feedback',
      description: 'Objective answers graded instantly with transparent result delivery.',
      image: 'https://plus.unsplash.com/premium_photo-1677093906033-dc2beb53ace3?q=80&w=2080&auto=format&fit=crop'
    },
    {
      title: 'Premium Institution Access',
      description: 'Deep analytics, branding, secure integrations & priority support.',
      image: 'https://plus.unsplash.com/premium_photo-1674669009418-2643aa58b11b?q=80&w=1974&auto=format&fit=crop'
    },
    {
      title: 'Rich Dashboards & Reports',
      description: 'Visualize performance & activity logs with export-ready dashboards.',
      image: 'https://plus.unsplash.com/premium_photo-1720556221767-990b2e11807c?q=80&w=2070&auto=format&fit=crop'
    }
  ];
}
