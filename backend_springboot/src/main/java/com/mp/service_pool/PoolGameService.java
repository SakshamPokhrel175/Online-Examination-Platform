package com.mp.service_pool;

import com.mp.entity_pool.PoolLiveAnswer;
import com.mp.entity_pool.PoolLivePlayer;
import com.mp.entity_pool.PoolLiveQuizSession;
import com.mp.repository_pool.PoolAnswerRepository;
import com.mp.repository_pool.PoolPlayerRepository;
import com.mp.repository_pool.PoolSessionRepository;
import com.mp.repository.QuestionRepository;
import com.mp.repository.QuizRepository;
import com.mp.dto_pool.PoolLiveQuestionDTO;
import com.mp.entity.Question;
import com.mp.entity.Quiz;
import com.mp.entity.User;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Random;

@Service
@Transactional
public class PoolGameService {

    private final PoolSessionRepository sessionRepository;
    private final PoolPlayerRepository playerRepository;
    private final PoolAnswerRepository answerRepository;
    private final QuestionRepository questionRepository;
    private final QuizRepository quizRepository;


    public PoolGameService(
            PoolSessionRepository sessionRepository,
            PoolPlayerRepository playerRepository,
            PoolAnswerRepository answerRepository,
            QuestionRepository questionRepository,
            QuizRepository quizRepository
    ) {
        this.sessionRepository = sessionRepository;
        this.playerRepository = playerRepository;
        this.answerRepository = answerRepository;
        this.questionRepository = questionRepository;
        this.quizRepository = quizRepository;
    }



    // =====================================================
    // 1️⃣ START LIVE GAME (HOST)
    // =====================================================
    public PoolLiveQuizSession startGame(Long quizId) {

        // 🧹 END any previous active session for this quiz
        sessionRepository.findAll().stream()
                .filter(s ->
                        s.getQuizId().equals(quizId) &&
                        !"FINISHED".equals(s.getStatus())
                )
                .forEach(s -> {
                    s.setStatus("FINISHED");
                    sessionRepository.save(s);
                });


        // 🆕 Create fresh session
        String gamePin = generateGamePin();

        PoolLiveQuizSession session =
                new PoolLiveQuizSession(gamePin, quizId);

        session.setStatus("WAITING");

        return sessionRepository.save(session);
    }


    // =====================================================
    // 2️⃣ JOIN GAME (PLAYER)
    // =====================================================
    public PoolLivePlayer joinGame(String gamePin, String nickname) {

        // 1️⃣ Validate session
        PoolLiveQuizSession session = sessionRepository
                .findByGamePin(gamePin)
                .orElseThrow(() -> new RuntimeException("Invalid Game PIN"));
        
     // ⏳ Check PIN expiration
        if (session.getExpiresAt().isBefore(LocalDateTime.now())) {

            destroySession(gamePin);

            throw new RuntimeException("Game PIN expired");
        }



        if (!"WAITING".equals(session.getStatus())) {
            throw new RuntimeException("Game already started");
        }

        // 2️⃣ Fetch quiz + creator (IMPORTANT)
        Quiz quiz = quizRepository.findByIdWithCreator(session.getQuizId())
                .orElseThrow(() -> new RuntimeException("Quiz not found"));

        User creator = quiz.getCreatedBy();

        // 3️⃣ Enforce POOL-ONLY access rules
        if ("GENERAL".equalsIgnoreCase(creator.getUserType())) {

            // GENERAL quiz → block institute users
            if (creator.getInstitution() != null) {
                throw new RuntimeException("Invalid quiz configuration");
            }

        } else if ("INSTITUTE".equalsIgnoreCase(creator.getUserType())) {

            // INSTITUTE quiz → nickname-only is not enough
            // Joining user must already exist as institutional user
            // (Pool players are anonymous, so enforce at session level)

            if (creator.getInstitution() == null) {
                throw new RuntimeException("Institution not found for quiz");
            }
        }

        // 4️⃣ Prevent duplicate nickname
        if (playerRepository.existsByGamePinAndNickname(gamePin, nickname)) {
            throw new RuntimeException("Nickname already taken");
        }

        // 5️⃣ Create Pool player (POOL ONLY)
        PoolLivePlayer player = new PoolLivePlayer(gamePin, nickname);
        return playerRepository.save(player);
    }


    // =====================================================
    // 3️⃣ GET ALL PLAYERS (LOBBY / SCOREBOARD)
    // =====================================================
    public List<PoolLivePlayer> getPlayers(String gamePin) {

        sessionRepository.findByGamePin(gamePin)
                .orElseThrow(() ->
                        new RuntimeException("Invalid Game PIN")
                );

        return playerRepository.findByGamePin(gamePin);
    }

    // =====================================================
    // 🔢 GAME PIN GENERATOR
    // =====================================================
    private String generateGamePin() {

        Random random = new Random();
        String pin;

        do {
            pin = String.valueOf(100000 + random.nextInt(900000));
        } while (sessionRepository.existsByGamePin(pin));

        return pin;
    }
    
    
    
    // =====================================================
    // 4️⃣ SUBMIT ANSWER (PLAYER)
    // =====================================================
    public boolean submitAnswer(
            String gamePin,
            String nickname,
            Long questionId,
            String selectedAnswer
    ) {

        PoolLiveQuizSession session = sessionRepository
                .findByGamePin(gamePin)
                .orElseThrow(() -> new RuntimeException("Invalid Game PIN"));
        
        if ("FINISHED".equals(session.getStatus())) {
            return false;
        }
        
     // ⏱ BLOCK if question time expired
        if (session.getQuestionStartedAt() != null) {

            long elapsed =
                    java.time.Duration.between(
                            session.getQuestionStartedAt(),
                            java.time.LocalDateTime.now()
                    ).getSeconds();

            long remaining =
                    session.getQuestionDuration() - elapsed;

            if (remaining <= 0) {
                return false; // ❌ Too late
            }
        }



        PoolLivePlayer player = playerRepository
                .findByGamePinAndNickname(gamePin, nickname)
                .orElseThrow(() -> new RuntimeException("Player not found"));

        // Prevent double answer
        if (player.isAnswered()) {
            return false;
        }

        Question question = questionRepository
                .findById(questionId)
                .orElseThrow(() -> new RuntimeException("Question not found"));

        boolean isCorrect =
                question.getCorrectAnswer()
                        .equalsIgnoreCase(selectedAnswer);

        // ⏱ Calculate response time
        LocalDateTime now = LocalDateTime.now();
        long responseTime = 0;
        long remaining = 0;

        if (session.getQuestionStartedAt() != null) {

            long elapsed = Duration.between(
                    session.getQuestionStartedAt(),
                    now
            ).getSeconds();

            responseTime = elapsed;
            remaining = session.getQuestionDuration() - elapsed;

            if (remaining < 0) {
                remaining = 0;
            }
        }

        // 🎯 Speed-based scoring
        int awardedPoints = 0;

        if (isCorrect && session.getQuestionStartedAt() != null) {

            long elapsed = Duration.between(
                    session.getQuestionStartedAt(),
                    LocalDateTime.now()
            ).getSeconds();

            remaining = session.getQuestionDuration() - elapsed;

            if (remaining < 0) {
                remaining = 0;
            }

            int basePoints = 100;

            int bonus = (int) (
                    ((double) remaining / session.getQuestionDuration()) * 100
            );

            awardedPoints = basePoints + bonus;

            player.setScore(player.getScore() + awardedPoints);
        }



        // 💾 Save answer with timing data
        PoolLiveAnswer answer = new PoolLiveAnswer(
                gamePin,
                nickname,
                questionId,
                selectedAnswer,
                isCorrect,
                now,
                responseTime,
                awardedPoints
        );

        answerRepository.save(answer);


        // Mark answered
        player.setAnswered(true);
        playerRepository.save(player);

        // 🔥 AUTO-NEXT CHECK
        List<PoolLivePlayer> players =
                playerRepository.findByGamePin(gamePin);

        if (players.isEmpty()) {
            return false;
        }

        boolean allAnswered = players.stream().allMatch(PoolLivePlayer::isAnswered);

        if (allAnswered) {
            session.setStatus("RESULT");
            sessionRepository.save(session);
        }

        return allAnswered;

    }


    // =====================================================
    // 5️⃣ PREPARE NEXT QUESTION (HOST)
    // =====================================================
    public void prepareNextQuestion(String gamePin) {

        PoolLiveQuizSession session = sessionRepository
                .findByGamePin(gamePin)
                .orElseThrow(() -> new RuntimeException("Invalid Game PIN"));

        session.setStatus("LIVE");

        sessionRepository.save(session);

        // Reset answered flag
        List<PoolLivePlayer> players =
                playerRepository.findByGamePin(gamePin);

        for (PoolLivePlayer player : players) {
            player.setAnswered(false);
        }

        playerRepository.saveAll(players);
    }


    
    
    
    public PoolLiveQuestionDTO getNextQuestion(String gamePin) {

        PoolLiveQuizSession session = sessionRepository
                .findByGamePin(gamePin)
                .orElseThrow(() -> new RuntimeException("Invalid Game PIN"));

        List<Question> questions =
                questionRepository.findByQuizId(session.getQuizId());

        int index = session.getCurrentQuestionIndex();

        if (index >= questions.size()) {
            session.setStatus("FINISHED");
            sessionRepository.save(session);
            return null;
        }

        Question q = questions.get(index);

        // 🔥 AFTER fetching question → increment for next round
//        session.setCurrentQuestionIndex(index + 1);
//        sessionRepository.save(session);

        return new PoolLiveQuestionDTO(
                q.getId(),
                q.getContent(),
                q.getOptions(),
                index + 1,
                questions.size()
        );

    }
    
 // =====================================================
 // 🔁 INCREMENT QUESTION INDEX
 // =====================================================
 public void moveToNextIndex(String gamePin) {

     PoolLiveQuizSession session = sessionRepository
             .findByGamePin(gamePin)
             .orElseThrow(() -> new RuntimeException("Invalid Game PIN"));

     session.setCurrentQuestionIndex(
             session.getCurrentQuestionIndex() + 1
     );

     sessionRepository.save(session);
 }

    
    
 // =====================================================
 // 6️⃣ END GAME (HOST)
 // =====================================================
    public void endGame(String gamePin) {

        PoolLiveQuizSession session = sessionRepository
                .findByGamePin(gamePin)
                .orElseThrow(() -> new RuntimeException("Invalid Game PIN"));

        session.setStatus("FINISHED");
        sessionRepository.save(session);

        // Reset players answered flag
        List<PoolLivePlayer> players =
                playerRepository.findByGamePin(gamePin);

        for (PoolLivePlayer player : players) {
            player.setAnswered(false);
        }

        playerRepository.saveAll(players);
    }

 
 public String getCorrectAnswer(Long questionId) {
	    Question q = questionRepository.findById(questionId)
	            .orElseThrow(() -> new RuntimeException("Question not found"));

	    return q.getCorrectAnswer();
	}

 
 
//=====================================================
//🔎 GET CURRENT QUESTION (NO INDEX INCREMENT)
//=====================================================
 public PoolLiveQuestionDTO getCurrentQuestion(String gamePin) {

	    PoolLiveQuizSession session = sessionRepository
	            .findByGamePin(gamePin)
	            .orElseThrow();

	    int index = session.getCurrentQuestionIndex() - 1;

	    List<Question> questions =
	            questionRepository.findByQuizId(session.getQuizId());

	    if (index < 0 || index >= questions.size()) {
	        return null;
	    }

	    Question q = questions.get(index);

	    return new PoolLiveQuestionDTO(
	            q.getId(),
	            q.getContent(),
	            q.getOptions(),
	            index + 1,
	            questions.size()
	    );
	}


public List<Question> getQuestionsForQuiz(Long quizId) {
    return questionRepository.findByQuizId(quizId);
}


//=====================================================
//🔥 DESTROY SESSION COMPLETELY (SECURE END)
//=====================================================
public void destroySession(String gamePin) {

 PoolLiveQuizSession session = sessionRepository
         .findByGamePin(gamePin)
         .orElseThrow(() -> new RuntimeException("Invalid Game PIN"));

 // 1️⃣ Delete answers
 answerRepository.deleteByGamePin(gamePin);

 // 2️⃣ Delete players
 playerRepository.deleteByGamePin(gamePin);

 // 3️⃣ Delete session itself
 sessionRepository.delete(session);
}





}
