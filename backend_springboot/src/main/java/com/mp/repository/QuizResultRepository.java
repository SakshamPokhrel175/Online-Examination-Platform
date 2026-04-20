package com.mp.repository;

import com.mp.entity.QuizResult;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface QuizResultRepository extends JpaRepository<QuizResult, Long> {

    List<QuizResult> findByUserEmailOrderByAttemptDateDesc(String email);

    List<QuizResult> findByQuizIdOrderByScoreDesc(Long quizId);

    List<QuizResult> findByQuizIdOrderByAttemptDateDesc(Long quizId);

    List<QuizResult> findByQuizIdAndAttemptDateBetween(
        Long quizId,
        LocalDateTime from,
        LocalDateTime to
    );

//    Optional<QuizResult> findByQuizIdAndUserEmail(Long quizId, String email);

	void deleteByQuiz_IdAndUser_Email(Long id, String email);
	
	Optional<QuizResult> findByQuiz_IdAndUser_Email(Long quizId, String email);

}
