package com.mp.controller;

import com.mp.entity.Question;
import com.mp.entity.Quiz;
import com.mp.repository.QuestionRepository;
import com.mp.repository.QuizRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/questions")
public class QuestionController {

    private final QuestionRepository questionRepository;
    private final QuizRepository quizRepository;

    public QuestionController(QuestionRepository questionRepository, QuizRepository quizRepository) {
        this.questionRepository = questionRepository;
        this.quizRepository = quizRepository;
    }

    // Get questions for a specific quiz
    @GetMapping("/quiz/{quizId}")
    public ResponseEntity<List<Question>> getQuestionsByQuiz(@PathVariable Long quizId) {

        // Ensure quiz exists
        quizRepository.findById(quizId)
            .orElseThrow(() -> new RuntimeException("Quiz not found"));

        List<Question> questions = questionRepository.findByQuizId(quizId);
        return ResponseEntity.ok(questions);
    }


    // Add a new question
    @PostMapping("/quiz/{quizId}")
    public ResponseEntity<?> addQuestion(@PathVariable Long quizId, @RequestBody Question question) {
        return quizRepository.findById(quizId).map(quiz -> {
            question.setQuiz(quiz);
            Question saved = questionRepository.save(question);
            
            // Update quiz question count
            quiz.setQuestionsCount(quiz.getQuestionsCount() + 1);
            quizRepository.save(quiz);
            
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    // Delete a question
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteQuestion(@PathVariable Long id) {
        questionRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}