package com.mp.repository_pool;

import com.mp.entity_pool.PoolLiveAnswer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PoolAnswerRepository extends JpaRepository<PoolLiveAnswer, Long> {

    // All answers for a question in a live session
    List<PoolLiveAnswer> findByGamePinAndQuestionId(String gamePin, Long questionId);

    // Check if player already answered this question
    Optional<PoolLiveAnswer> findByGamePinAndQuestionIdAndNickname(
            String gamePin, Long questionId, String nickname
    );
    
    void deleteByGamePin(String gamePin);

}
