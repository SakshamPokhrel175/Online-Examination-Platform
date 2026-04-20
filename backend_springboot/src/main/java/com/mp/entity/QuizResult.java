package com.mp.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;

@Entity
@Table(name = "quiz_results")
@Data
@NoArgsConstructor
public class QuizResult {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne
    @JoinColumn(name = "quiz_id")
    private Quiz quiz;

    private int score;
    private int totalQuestions;
    private LocalDateTime attemptDate;
    private String status;

    // Store User's Answers (QuestionID -> SelectedOption)
    @ElementCollection
    @CollectionTable(name = "quiz_submission_answers", joinColumns = @JoinColumn(name = "result_id"))
    @MapKeyColumn(name = "question_id")
    @Column(name = "selected_option")
    private Map<Long, String> answers;
    
    
 // ================= RETAKE CONTROL =================

 // Attempt number: 1 = first attempt, 2 = retake, etc.
 @Column(nullable = false)
 private int attemptNumber = 1;

 // Can student retake this quiz?
 @Column(nullable = false)
 private boolean retakeAllowed = false;

 // Maximum number of attempts allowed (including first)
 @Column(nullable = false)
 private int maxAttempts = 1;

}