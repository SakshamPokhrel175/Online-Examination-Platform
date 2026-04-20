package com.mp.repository_pool;

import com.mp.entity_pool.PoolLivePlayer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PoolPlayerRepository extends JpaRepository<PoolLivePlayer, Long> {

    // All players in a live session
    List<PoolLivePlayer> findByGamePin(String gamePin);

    // Find a specific player in a session
    Optional<PoolLivePlayer> findByGamePinAndNickname(String gamePin, String nickname);

    // Check duplicate nickname in same game
    boolean existsByGamePinAndNickname(String gamePin, String nickname);
    
    void deleteByGamePin(String gamePin);

}
