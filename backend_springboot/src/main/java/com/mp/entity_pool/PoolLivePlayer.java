package com.mp.entity_pool;

import jakarta.persistence.*;

@Entity
@Table(name = "pool_live_player")
public class PoolLivePlayer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Game PIN this player joined
    @Column(nullable = false)
    private String gamePin;

    // Player nickname (entered before game starts)
    @Column(nullable = false)
    private String nickname;

    // Live score (updated after every question)
    @Column(nullable = false)
    private int score;

    // To prevent multiple answers per question
    @Column(nullable = false)
    private boolean answered;

    // ---------------- CONSTRUCTORS ----------------

    public PoolLivePlayer() {
        this.score = 0;
        this.answered = false;
    }

    public PoolLivePlayer(String gamePin, String nickname) {
        this();
        this.gamePin = gamePin;
        this.nickname = nickname;
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

    public int getScore() {
        return score;
    }

    public void setScore(int score) {
        this.score = score;
    }

    public boolean isAnswered() {
        return answered;
    }

    public void setAnswered(boolean answered) {
        this.answered = answered;
    }
}
