package com.mp.service_pool;

import com.mp.dto_pool.PoolScoreboardDTO;
import com.mp.entity_pool.PoolLiveQuizSession;
import com.mp.repository_pool.PoolSessionRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.context.annotation.Lazy;


import java.time.Duration;
import java.time.LocalDateTime;
import java.util.concurrent.*;

@Service
public class PoolTimerService {

    private final PoolSessionRepository sessionRepository;
    private final PoolGameService poolGameService;
    private final SimpMessagingTemplate messagingTemplate;
    

    private final ScheduledExecutorService scheduler =
            Executors.newScheduledThreadPool(4);
    
    private final ConcurrentHashMap<String, ScheduledFuture<?>> timers =
            new ConcurrentHashMap<>();


    public PoolTimerService(
            PoolSessionRepository sessionRepository,
            @Lazy PoolGameService poolGameService,
            SimpMessagingTemplate messagingTemplate
    ) {
        this.sessionRepository = sessionRepository;
        this.poolGameService = poolGameService;
        this.messagingTemplate = messagingTemplate;
    }


    public void startTimer(String gamePin) {

        // 🧹 Cancel previous timer
        ScheduledFuture<?> old = timers.remove(gamePin);
        if (old != null) old.cancel(true);

        PoolLiveQuizSession session = sessionRepository
                .findByGamePin(gamePin)
                .orElseThrow();

        session.setQuestionStartedAt(LocalDateTime.now());
        sessionRepository.save(session);

        ScheduledFuture<?> future =
                scheduler.scheduleAtFixedRate(
                        () -> tick(gamePin),
                        0, 1, TimeUnit.SECONDS
                );

        timers.put(gamePin, future);
    }
    
    public void stopTimer(String gamePin) {
        ScheduledFuture<?> future = timers.remove(gamePin);
        if (future != null) future.cancel(true);
    }



    private void tick(String gamePin) {

        PoolLiveQuizSession session = sessionRepository
                .findByGamePin(gamePin)
                .orElse(null);

        if (session == null) return;

        long elapsed =
                Duration.between(
                        session.getQuestionStartedAt(),
                        LocalDateTime.now()
                ).getSeconds();

        long remaining =
                session.getQuestionDuration() - elapsed;

        if (remaining <= 0) {

            // Send 0 to frontend first
            messagingTemplate.convertAndSend(
                    "/topic/pool/" + gamePin + "/timer",
                    0
            );

            handleTimeout(gamePin);
            return;
        }



        // 🔁 Broadcast remaining seconds
        messagingTemplate.convertAndSend(
                "/topic/pool/" + gamePin + "/timer",
                remaining
        );
    }

    private void handleTimeout(String gamePin) {

        stopTimer(gamePin);

        PoolLiveQuizSession session = sessionRepository
                .findByGamePin(gamePin)
                .orElse(null);

        if (session == null) return;

        try {

            // 1️⃣ Get CURRENT question (DO NOT increment)
            var question =
                    poolGameService.getCurrentQuestion(gamePin);

            // 2️⃣ Get correct answer
            String correct =
                    poolGameService.getCorrectAnswer(question.getQuestionId());

            // 3️⃣ Broadcast correct answer
            messagingTemplate.convertAndSend(
                    "/topic/pool/" + gamePin + "/result",
                    correct
            );

            // ⏳ 3 second delay before scoreboard
            scheduler.schedule(() -> {
                var players = poolGameService.getPlayers(gamePin);

                messagingTemplate.convertAndSend(
                        "/topic/pool/" + gamePin + "/scoreboard",
                        new PoolScoreboardDTO(players)
                );
            }, 3, TimeUnit.SECONDS);


        } catch (Exception e) {

            poolGameService.endGame(gamePin);

            messagingTemplate.convertAndSend(
                    "/topic/pool/" + gamePin + "/end",
                    "END"
            );
        }
    }



}
