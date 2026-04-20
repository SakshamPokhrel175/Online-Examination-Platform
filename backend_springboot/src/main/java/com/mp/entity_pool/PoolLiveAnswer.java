package com.mp.entity_pool;

import java.time.LocalDateTime;

import jakarta.persistence.*;

@Entity
@Table(name = "pool_live_answer")
public class PoolLiveAnswer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Game PIN of the live session
    @Column(nullable = false)
    private String gamePin;

    // Player who answered
    @Column(nullable = false)
    private String nickname;

    // Question being answered (from Question entity)
    @Column(nullable = false)
    private Long questionId;

    // Option selected by player
    @Column(nullable = false)
    private String selectedAnswer;

    // Whether the answer is correct
    @Column(nullable = false)
    private boolean correct;
    
 // When answer was submitted
    @Column(nullable = false)
    private LocalDateTime submittedAt;

    // Response time in seconds
    @Column(nullable = false)
    private long responseTime;

    // Points awarded for this answer
    @Column(nullable = false)
    private int awardedPoints;


    // ---------------- CONSTRUCTORS ----------------

    public PoolLiveAnswer() {
    }

    public PoolLiveAnswer(String gamePin,
            String nickname,
            Long questionId,
            String selectedAnswer,
            boolean correct,
            LocalDateTime submittedAt,
            long responseTime,
            int awardedPoints) {

this.gamePin = gamePin;
this.nickname = nickname;
this.questionId = questionId;
this.selectedAnswer = selectedAnswer;
this.correct = correct;
this.submittedAt = submittedAt;
this.responseTime = responseTime;
this.awardedPoints = awardedPoints;
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

    public String getNickname() {
        return nickname;
    }

    public void setNickname(String nickname) {
        this.nickname = nickname;
    }

    public Long getQuestionId() {
        return questionId;
    }

    public void setQuestionId(Long questionId) {
        this.questionId = questionId;
    }

    public String getSelectedAnswer() {
        return selectedAnswer;
    }

    public void setSelectedAnswer(String selectedAnswer) {
        this.selectedAnswer = selectedAnswer;
    }

    public boolean isCorrect() {
        return correct;
    }

    public void setCorrect(boolean correct) {
        this.correct = correct;
    }
    
    
    public LocalDateTime getSubmittedAt() {
        return submittedAt;
    }

    public void setSubmittedAt(LocalDateTime submittedAt) {
        this.submittedAt = submittedAt;
    }

    public long getResponseTime() {
        return responseTime;
    }

    public void setResponseTime(long responseTime) {
        this.responseTime = responseTime;
    }

    public int getAwardedPoints() {
        return awardedPoints;
    }

    public void setAwardedPoints(int awardedPoints) {
        this.awardedPoints = awardedPoints;
    }

}
