package com.mp.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Entity
@Table(name = "questions")
@Data
@NoArgsConstructor
public class Question {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 5000)
    private String content; // The Question Text or Problem Statement

    private String type; // "MCQ" or "CODING"

    // --- MCQ FIELDS ---
    @ElementCollection(fetch = FetchType.EAGER)
    private List<String> options;

    
    private String correctAnswer;

    // --- CODING FIELDS ---
    private String allowedLanguage;
    @Column(length = 2000)
    private String sampleInput;
    @Column(length = 2000)
    private String sampleOutput;

    @ManyToOne
    @JoinColumn(name = "quiz_id")
    @JsonIgnore // Prevent infinite recursion when fetching quiz answers
    private Quiz quiz;
}