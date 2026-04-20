package com.mp.controller_pool;

import com.mp.dto_pool.PoolJoinGameRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import com.mp.dto_pool.PoolScoreboardDTO;

import com.mp.entity.Quiz;
import com.mp.entity.User;
import com.mp.entity_pool.PoolLivePlayer;
import com.mp.entity_pool.PoolLiveQuizSession;
import com.mp.repository.QuizRepository;
import com.mp.repository.UserRepository;
import com.mp.service.QuizService;
import com.mp.service_pool.PoolGameService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/pool")
public class PoolController {

    private final PoolGameService poolGameService;
    private final UserRepository userRepository;
    private final QuizRepository quizRepository;
    private final QuizService quizService;
    private final SimpMessagingTemplate messagingTemplate;


    public PoolController(
            PoolGameService poolGameService,
            UserRepository userRepository,
            QuizRepository quizRepository,
            QuizService quizService,
            SimpMessagingTemplate messagingTemplate
    ) {
        this.poolGameService = poolGameService;
        this.userRepository = userRepository;
        this.quizRepository = quizRepository;
        this.quizService = quizService;
        this.messagingTemplate = messagingTemplate;
    }


    // ===============================
    // 1️⃣ Start Live Game (Host)
    // ===============================
    @PostMapping("/start/{quizId}")
    public ResponseEntity<?> startGame(@PathVariable Long quizId) {

        PoolLiveQuizSession session = poolGameService.startGame(quizId);

        return ResponseEntity.ok(
                Map.of(
                        "gamePin", session.getGamePin(),
                        "status", session.getStatus()
                )
        );
    }

    // ===============================
    // 2️⃣ Join Game (Player)
    // ===============================
    @PostMapping("/join")
    public ResponseEntity<?> joinGame(@RequestBody PoolJoinGameRequest request) {

        PoolLivePlayer player =
                poolGameService.joinGame(request.getGamePin(), request.getNickname());

        // 🔥 Get updated players list
        List<PoolLivePlayer> players =
                poolGameService.getPlayers(request.getGamePin());

        // 🔥 Broadcast lobby update
        messagingTemplate.convertAndSend(
                "/topic/pool/" + request.getGamePin() + "/scoreboard",
                new PoolScoreboardDTO(players)
        );

        return ResponseEntity.ok(
                Map.of(
                        "nickname", player.getNickname(),
                        "score", player.getScore()
                )
        );
    }


    // ===============================
    // 3️⃣ Get Lobby Players
    // ===============================
    @GetMapping("/players/{gamePin}")
    public ResponseEntity<List<PoolLivePlayer>> getPlayers(@PathVariable String gamePin) {

        return ResponseEntity.ok(
                poolGameService.getPlayers(gamePin)
        );
    }

    // ===============================
    // 4️⃣ Get My Pool Quizzes
    // ===============================
    @GetMapping("/quizzes")
    public ResponseEntity<?> getMyPoolQuizzes(Principal principal) {

        User user = userRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<Quiz> quizzes = quizRepository.findByCreatedByAndCreatorType(user, "POOL");


        return ResponseEntity.ok(quizzes);
    }
    
    
 // ===============================
 // 5️⃣ Create Pool Quiz
 // ===============================
 @PostMapping(value = "/create-with-import", consumes = "multipart/form-data")
 public ResponseEntity<?> createPoolQuiz(
         @RequestParam String title,
         @RequestParam(required = false) String description,
         @RequestPart(required = false) MultipartFile file,
         Principal principal
 ) {

     if (principal == null) {
         return ResponseEntity.status(401).body("Unauthorized");
     }

     // IMPORTANT: pass creatorType = "POOL"
     Quiz quiz = quizService.createQuiz(
             title,
             description,
             principal.getName(),
             "POOL"
     );

     if (file != null && !file.isEmpty()) {
         quizService.importQuestionsFromFile(quiz, file);
     }

     return ResponseEntity.ok(quiz);
 }


}
