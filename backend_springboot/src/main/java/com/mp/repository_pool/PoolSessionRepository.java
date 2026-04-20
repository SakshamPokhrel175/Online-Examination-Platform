package com.mp.repository_pool;

import com.mp.entity_pool.PoolLiveQuizSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PoolSessionRepository extends JpaRepository<PoolLiveQuizSession, Long> {

    // Find live session by Game PIN
    Optional<PoolLiveQuizSession> findByGamePin(String gamePin);

    // Check if a Game PIN already exists (safety)
    boolean existsByGamePin(String gamePin);
}
