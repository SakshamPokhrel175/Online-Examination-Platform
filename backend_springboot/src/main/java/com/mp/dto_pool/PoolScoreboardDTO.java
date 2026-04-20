package com.mp.dto_pool;

import com.mp.entity_pool.PoolLivePlayer;

import java.util.List;

public class PoolScoreboardDTO {

    private List<PoolLivePlayer> players;

    public PoolScoreboardDTO() {
    }

    public PoolScoreboardDTO(List<PoolLivePlayer> players) {
        this.players = players;
    }

    public List<PoolLivePlayer> getPlayers() {
        return players;
    }

    public void setPlayers(List<PoolLivePlayer> players) {
        this.players = players;
    }
}
