package com.mp.entity_pool;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "pool_live_quiz_session")
public class PoolLiveQuizSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 6-digit Game PIN (like Kahoot)
    @Column(nullable = false, unique = true)
    private String gamePin;

    // Reference to existing Quiz
    @Column(nullable = false)
    private Long quizId;

    // WAITING, LIVE, ENDED
    @Column(nullable = false)
    private String status;

    // Which question is currently live
    @Column(nullable = false)
    private int currentQuestionIndex;

    @Column(nullable = false)
    private LocalDateTime createdAt;
    
 // Timer (seconds)
    @Column(nullable = false)
    private int questionDuration;

    // When current question started
    private LocalDateTime questionStartedAt;
    
 // PIN expiration time
//    @Column(nullable = false)
//    private LocalDateTime expiresAt;

    @Column(nullable = true)
    private LocalDateTime expiresAt;


    // ---------------- CONSTRUCTORS ----------------

    public PoolLiveQuizSession() {
        this.createdAt = LocalDateTime.now();
        this.expiresAt = this.createdAt.plusMinutes(30); // ⏳ 30 min expiry
        this.status = "WAITING";
        this.currentQuestionIndex = 0;
        this.questionDuration = 15;
    }


    public PoolLiveQuizSession(String gamePin, Long quizId) {
        this();
        this.gamePin = gamePin;
        this.quizId = quizId;
    }

    // ---------------- GETTERS & SETTERS ----------------

    public Long getId() {
        return id;
    }

    public String getGamePin() {
        return gamePin;
    }

    public void setGamePin(String gamePin) {
        this.gamePin = gamePin;
    }

    public Long getQuizId() {
        return quizId;
    }

    public void setQuizId(Long quizId) {
        this.quizId = quizId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public int getCurrentQuestionIndex() {
        return currentQuestionIndex;
    }

    public void setCurrentQuestionIndex(int currentQuestionIndex) {
        this.currentQuestionIndex = currentQuestionIndex;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public int getQuestionDuration() {
        return questionDuration;
    }

    public void setQuestionDuration(int questionDuration) {
        this.questionDuration = questionDuration;
    }

    public LocalDateTime getQuestionStartedAt() {
        return questionStartedAt;
    }

    public void setQuestionStartedAt(LocalDateTime questionStartedAt) {
        this.questionStartedAt = questionStartedAt;
    }
    
    public LocalDateTime getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(LocalDateTime expiresAt) {
        this.expiresAt = expiresAt;
    }



}
