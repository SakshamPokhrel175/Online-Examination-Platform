<p align="center">
  <img src="https://img.shields.io/badge/Angular-Frontend-red?logo=angular" />
  <img src="https://img.shields.io/badge/SpringBoot-Backend-green?logo=springboot" />
  <img src="https://img.shields.io/badge/MySQL-Database-blue?logo=mysql" />
</p>

# 🎓 Secure Online Examination Platform

A full-stack web application for conducting secure online examinations and real-time quizzes with AI-based proctoring and role-based access control.

---

## 🚀 Overview

This platform enables institutions and users to conduct **secure, scalable, and intelligent online exams**.  
It combines **AI-based proctoring**, **real-time quiz systems**, and **role-based dashboards** to maintain academic integrity and enhance user experience.

---

## ✨ Key Features

### 🔐 AI-Based Proctoring System
- Real-time webcam monitoring using OpenCV
- Face detection with Haar Cascade (`haarcascade_frontalface_alt.xml`)
- Suspicious activity alerts
- WebSocket-based live proctoring communication

---

### 📝 Examination Management
- Create and manage quizzes
- Timed exam sessions
- Automatic result evaluation
- Answer sheet tracking

---

### 🎯 Pool Quiz (Real-Time Multiplayer)
- Live quiz sessions with multiple players
- WebSocket-based communication
- Real-time leaderboard updates
- Instant answer validation

---

### 👥 Role-Based Access Control
- **Admin** – system control & analytics
- **Teacher/Institution** – manage quizzes & students
- **Student** – attempt exams
- **General User** – participate in pool quizzes

---

### 📊 Advanced Features
- JWT Authentication & Authorization
- PDF Report Generation (iText)
- Email Notification System
- Messaging System (ActiveMQ)
- Statistics & analytics dashboard

---

## 🏗️ Tech Stack

### 🔹 Frontend
- Angular
- TypeScript
- HTML / CSS

### 🔹 Backend
- Spring Boot 3
- Spring Security (JWT)
- Spring Data JPA
- WebSocket (Real-time features)

### 🔹 Database
- MySQL

### 🔹 AI & Media
- OpenCV (Face Detection)

### 🔹 Other Tools
- iText (PDF generation)
- ActiveMQ (Messaging)
- Java Mail Sender

---

## 📁 Project Structure

```
Online-Examination-Platform/
│
├── backend_springboot/
│   ├── config/              # Security & Web configuration
│   ├── controller/          # REST API controllers
│   ├── controller_pool/     # Real-time pool (quiz)
│   ├── service/             # Business logic layer
│   ├── service_pool/        # Pool quiz logic
│   ├── repository/          # JPA repositories
│   ├── entity/              # Database models
│   ├── dto/                 # Data transfer objects
│   ├── security/            # JWT & auth filters
│   └── resources/
│
├── frontend_angular/
│   ├── core/                # Services, guards, interceptors
│   ├── Pages/               # UI components
│   ├── pool/                # Real-time quiz UI
│   └── environments/
│
├── README.md
├── LICENSE
└── .gitignore
```



---

## ⚙️ Backend Setup

```bash
cd backend_springboot
mvn clean install
mvn spring-boot:run
```

---

## 💻 Frontend Setup

```bash
cd frontend_angular
npm install
ng serve
```

---

## 🗄️ Database Configuration

### 🔹 application.properties

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/your_db
spring.datasource.username=root
spring.datasource.password=your_password
spring.jpa.hibernate.ddl-auto=update
```

---

## 🔐 Security

- JWT-based authentication  
- Role-based authorization  
- Custom user details service  
- Secure API endpoints  

---

## 🔄 Real-Time Communication

WebSocket is used for:

- Live quiz sessions  
- Proctoring alerts  
- Scoreboard updates  

---

## 🚀 Future Enhancements

- AI-based face recognition (identity verification)  
- Mobile app support  
- Cloud deployment (AWS / Docker)  
- Advanced cheating detection using ML  

---

## 👨‍💻 Author

**Saksham Pokhrel , Renuka Chaudhary , Saurab Gurung**

---

## 📜 License

This project is licensed under the MIT License.
