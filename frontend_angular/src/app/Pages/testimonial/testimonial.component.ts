import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-testimonial',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './testimonial.component.html',
  styleUrls: ['./testimonial.component.css']
})
export class TestimonialComponent {
  testimonials = [
    { 
      name: 'John Doe', 
      role: 'Student', 
      message: 'This platform made my exam experience seamless!', 
      image: 'https://cinimage.org/wp-content/uploads/2021/10/Testimonial-Videos-1.png' 
    },
    { 
      name: 'Dr. Smith', 
      role: 'Professor', 
      message: 'The remote proctoring feature is outstanding.', 
      image: 'https://t3.ftcdn.net/jpg/03/53/59/46/360_F_353594684_Ca3p9RIc3xgQ1Y6ff7Jk6nVe54v9NbpQ.jpg' 
    },
    { 
      name: 'Lisa Johnson', 
      role: 'Institution Admin', 
      message: 'Secure and reliable quiz platform for our university.', 
      image: 'https://images.pexels.com/photos/4347368/pexels-photo-4347368.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500' 
    }
  ];
}
