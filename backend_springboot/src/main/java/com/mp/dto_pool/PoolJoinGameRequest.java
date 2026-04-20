package com.mp.dto_pool;

public class PoolJoinGameRequest {

    private String gamePin;
    private String nickname;

    public PoolJoinGameRequest() {
        // default constructor required by Spring
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
}
