package com.mp.controller_pool;

import com.mp.dto_pool.PoolPlayerAnswerDTO;
import com.mp.dto_pool.PoolScoreboardDTO;
import com.mp.entity_pool.PoolLivePlayer;
import com.mp.service_pool.PoolGameService;
import com.mp.service_pool.PoolTimerService;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.List;

@Controller
public class PoolWebSocketController {

    private final PoolGameService poolGameService;
    private final SimpMessagingTemplate messagingTemplate;
    private final PoolTimerService timerService;


    public PoolWebSocketController(
            PoolGameService poolGameService,
            SimpMessagingTemplate messagingTemplate,
            PoolTimerService timerService
    ) {
        this.poolGameService = poolGameService;
        this.messagingTemplate = messagingTemplate;
        this.timerService = timerService;
    }


    // =====================================================
    // 1️⃣ PLAYER SUBMITS ANSWER
    // =====================================================
    @MessageMapping("/pool/answer")
    public void submitAnswer(@Payload PoolPlayerAnswerDTO dto) {

        boolean allAnswered =
                poolGameService.submitAnswer(
                        dto.getGamePin(),
                        dto.getNickname(),
                        dto.getQuestionId(),
                        dto.getSelectedAnswer()
                );

        // Always update scoreboard
        List<PoolLivePlayer> players =
                poolGameService.getPlayers(dto.getGamePin());

        PoolScoreboardDTO scoreboard =
                new PoolScoreboardDTO(players);

        messagingTemplate.convertAndSend(
                "/topic/pool/" + dto.getGamePin() + "/scoreboard",
                scoreboard
        );

        // 🔥 If ALL answered → move to RESULT phase
//        if (allAnswered) {
//
//            // 🛑 STOP TIMER
//            timerService.stopTimer(dto.getGamePin());
//
//            // ✅ Get correct answer
//            String correctAnswer =
//                    poolGameService.getCorrectAnswer(dto.getQuestionId());
//
//            // 📢 Broadcast result to all players
//            messagingTemplate.convertAndSend(
//                    "/topic/pool/" + dto.getGamePin() + "/result",
//                    correctAnswer
//            );
//        }
    }



    // =====================================================
    // 2️⃣ HOST MOVES TO NEXT QUESTION
    // =====================================================
    @MessageMapping("/pool/next-question")
    public void nextQuestion(@Payload String gamePin) {

        // ✅ ADD THIS BLOCK (VERY IMPORTANT)
        var session = poolGameService.getSession(gamePin);

        if (!"WAITING".equals(session.getStatus()) && !"RESULT".equals(session.getStatus())) {
            return; // 🚫 BLOCK unwanted triggers
        }

        // =============================

        poolGameService.prepareNextQuestion(gamePin);

        var question =
                poolGameService.getNextQuestion(gamePin);

        if (question == null) {

            timerService.stopTimer(gamePin);

            messagingTemplate.convertAndSend(
                    "/topic/pool/" + gamePin + "/end",
                    "END"
            );

            return;
        }

        messagingTemplate.convertAndSend(
                "/topic/pool/" + gamePin + "/question",
                question
        );

        timerService.startTimer(gamePin);

        // 🔥 AFTER sending question → increment index
        poolGameService.moveToNextIndex(gamePin);
    }





 
 
//=====================================================
//3️⃣ HOST ENDS GAME
//=====================================================
@MessageMapping("/pool/end")
public void endGame(@Payload String gamePin) {
	
	  // 🛑 STOP TIMER
	  timerService.stopTimer(gamePin);

  // 1️⃣ End game in DB
	  poolGameService.endGame(gamePin);

	// 🔥 DESTROY SESSION COMPLETELY
	poolGameService.destroySession(gamePin);

  // 2️⃣ Final scoreboard
  List<PoolLivePlayer> players =
          poolGameService.getPlayers(gamePin);

  PoolScoreboardDTO scoreboard =
          new PoolScoreboardDTO(players);

  // 3️⃣ Broadcast FINAL scoreboard
  messagingTemplate.convertAndSend(
          "/topic/pool/" + gamePin + "/scoreboard",
          scoreboard
  );

  // 4️⃣ Notify clients game ended
  messagingTemplate.convertAndSend(
          "/topic/pool/" + gamePin + "/end",
          "END"
  );
}


}
