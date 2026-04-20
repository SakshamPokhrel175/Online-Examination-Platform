package com.mp.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Entity
@Table(name = "quizzes")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Quiz {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // --- BASIC QUIZ INFO ---
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(unique = true, nullable = false)
    private String code;

    private boolean active;
    private int questionsCount;
    private LocalDate createdDate;

    // --- TIMER SETTINGS ---
    // Total time for entire quiz (in minutes)
    private Integer totalTimeMinutes;        // e.g., 30

    // Optional per-question timer (in seconds)
    private Integer perQuestionTimeSeconds; // e.g., 60 (nullable)

    // --- QUIZ BEHAVIOR SETTINGS ---
    // Auto-submit quiz when timer expires
    private boolean autoSubmit;

    // Shuffle questions to prevent cheating
    private boolean shuffleQuestions;

    // Enable AI-based proctoring / tab-switch detection
    private boolean proctoringEnabled;

    // --- QUIZ MODE ---
    // PRACTICE or GRADED
    @Column(length = 20)
    private String quizMode;

    // --- QUIZ CREATOR ---
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
        name = "created_by_user_id",
        nullable = false,
        foreignKey = @ForeignKey(name = "FK_QUIZ_CREATOR_REF")
    )
    @JsonIgnoreProperties({
        "password",
        "roles",
        "institution",
        "hibernateLazyInitializer",
        "handler"
    })
    private User createdBy;
    
    @OneToMany(mappedBy = "quiz", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<Question> questions;

    @OneToMany(mappedBy = "quiz", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<QuizResult> results;
    
    @Column(length = 20)
    private String creatorType; // GENERAL | POOL | INSTITUTION



    // --- CUSTOM CONSTRUCTOR (USED DURING QUIZ CREATION) ---
    public Quiz(String title, String description, String code, User createdBy) {
        this.title = title;
        this.description = description;
        this.code = code;
        this.createdBy = createdBy;

        // Default values
        this.active = true;
        this.questionsCount = 0;
        this.createdDate = LocalDate.now();

        // Default quiz behavior
        this.totalTimeMinutes = null;
        this.perQuestionTimeSeconds = null;
        this.autoSubmit = true;
        this.shuffleQuestions = true;
        this.proctoringEnabled = false;
        this.quizMode = "GRADED";
    }
}
