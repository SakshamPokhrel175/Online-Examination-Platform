package com.mp.controller;

import com.mp.entity.Quiz;
import com.mp.entity.QuizResult;

import org.springframework.transaction.annotation.Transactional;
import com.mp.entity.User;
import com.mp.repository.QuizRepository;
import com.mp.repository.QuizResultRepository;
import com.mp.repository.UserRepository;
import com.mp.service.QuizService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/quizzes")
public class QuizController {

	private final QuizService service;
	private final QuizRepository repository;
	private final UserRepository userRepository;
	private final QuizResultRepository resultRepository;

	public QuizController(QuizService service, QuizRepository repository, UserRepository userRepository,
			QuizResultRepository resultRepository) {
		this.service = service;
		this.repository = repository;
		this.userRepository = userRepository;
		this.resultRepository = resultRepository;
	}

	@GetMapping
	public ResponseEntity<List<Quiz>> getMyQuizzes(Principal principal) {
		if (principal == null)
			return ResponseEntity.status(401).build();
		return ResponseEntity.ok(service.getQuizzesByUser(principal.getName()));
	}

	/**
	 * FINAL, COMPLETE SECURITY CHECK FOR QUIZ ACCESS: Enforces three rules: 1. If
	 * Quiz is created by a Faculty (has Institute), Student MUST have the same
	 * Institute. 2. If Quiz is General-created, blocks Institute Users (to ensure
	 * separation). 3. Blocks cross-institutional access.
	 *
	 * Also blocks access immediately if the quiz is deactivated and returns a
	 * structured body.
	 */
	/**
	 * FINAL ACCESS CHECK BEFORE PLAYING QUIZ
	 */
	@GetMapping("/code/{code}")
	public ResponseEntity<?> getByCode(@PathVariable String code, Principal principal) {

		if (principal == null) {
			return ResponseEntity.status(401).body(Map.of("message", "Session expired. Please login again."));
		}

		Optional<Quiz> quizOpt = repository.findByCode(code);
		if (quizOpt.isEmpty()) {
			return ResponseEntity.status(404).body(Map.of("message", "Quiz not found. Check the code."));
		}

		Quiz quiz = quizOpt.get();

		// ❌ Block inactive quiz
		if (!quiz.isActive()) {
			return ResponseEntity.status(403)
					.body(Map.of("reason", "DEACTIVATED", "message", "This quiz has been deactivated by the creator."));
		}

		User student = userRepository.findByEmail(principal.getName()).orElse(null);
		if (student == null) {
			return ResponseEntity.status(401).body(Map.of("message", "User not found"));
		}

		// ❌ BLOCK CREATOR FROM PLAYING OWN QUIZ
		if (quiz.getCreatedBy().getEmail().equals(student.getEmail())) {
			return ResponseEntity.status(403)
					.body(Map.of("reason", "CREATOR_CANNOT_PLAY", "message", "You cannot play a quiz you created."));
		}

		String quizCreatorType = String.valueOf(quiz.getCreatedBy().getUserType());
		String playerUserType = String.valueOf(student.getUserType());


		// ❌ BLOCK PUBLIC GENERAL USERS FROM INSTITUTE QUIZ
//		if (quiz.getCreatedBy().getInstitution() != null) {
//
//		    if (student.getInstitution() == null) {
//		        return ResponseEntity.status(403).body(
//		            Map.of(
//		                "reason", "INSTITUTE_ONLY",
//		                "message", "This quiz is restricted to institutional students only."
//		            )
//		        );
//		    }
//
//		    Long studentInstId = student.getInstitution().getId();
//		    Long quizInstId = quiz.getCreatedBy().getInstitution().getId();
//
//		    if (!studentInstId.equals(quizInstId)) {
//		        return ResponseEntity.status(403).body(
//		            Map.of(
//		                "reason", "INSTITUTION_MISMATCH",
//		                "message", "This quiz belongs to another institution."
//		            )
//		        );
//		    }
//		}
		
		
		// ================= STRICT ROLE BASED ACCESS CONTROL =================

		// CASE 1: GENERAL QUIZ → ONLY GENERAL USERS
		if (quiz.getCreatedBy().getInstitution() == null) {

		    if (!"GENERAL".equalsIgnoreCase(playerUserType)) {
		        return ResponseEntity.status(403).body(
		            Map.of(
		                "reason", "GENERAL_ONLY",
		                "message", "This quiz is for General users only."
		            )
		        );
		    }
		}

		// CASE 2: INSTITUTE QUIZ → ONLY STUDENT OF SAME INSTITUTION
		if (quiz.getCreatedBy().getInstitution() != null) {

		    // Must be STUDENT
		    if (!"STUDENT".equalsIgnoreCase(playerUserType)) {
		        return ResponseEntity.status(403).body(
		            Map.of(
		                "reason", "STUDENT_ONLY",
		                "message", "Only students can play institutional quizzes."
		            )
		        );
		    }

		    // Must belong to institution
		    if (student.getInstitution() == null) {
		        return ResponseEntity.status(403).body(
		            Map.of(
		                "reason", "INSTITUTE_ONLY",
		                "message", "This quiz is restricted to institutional students only."
		            )
		        );
		    }

		    Long studentInstId = student.getInstitution().getId();
		    Long quizInstId = quiz.getCreatedBy().getInstitution().getId();

		    if (!studentInstId.equals(quizInstId)) {
		        return ResponseEntity.status(403).body(
		            Map.of(
		                "reason", "INSTITUTION_MISMATCH",
		                "message", "This quiz belongs to another institution."
		            )
		        );
		    }
		}


		
		
		// ================= RETAKE CHECK (BLOCK EARLY) =================

		QuizResult existing =
		    resultRepository.findByQuiz_IdAndUser_Email(
		        quiz.getId(),
		        student.getEmail()
		    ).orElse(null);

		if (existing != null && !existing.isRetakeAllowed()) {
		    return ResponseEntity.status(403).body(
		        Map.of(
		            "reason", "RETAKE_NOT_ALLOWED",
		            "message", "Retake not allowed yet. Please wait for approval."
		        )
		    );
		}


		// ✅ ACCESS GRANTED
		return ResponseEntity.ok(quiz);
	}

	@PostMapping
	public ResponseEntity<?> create(@RequestBody Map<String, String> payload, Principal principal) {
		if (principal == null)
			return ResponseEntity.status(401).build();

		return ResponseEntity.ok(
			    service.createQuiz(
			        payload.get("title"),
			        payload.get("description"),
			        principal.getName(),
			        "GENERAL"
			    )
			);

	}

	@DeleteMapping("/{id}")
	public ResponseEntity<?> delete(@PathVariable Long id, Principal principal) {

Quiz quiz = repository.findByIdWithCreator(id).orElseThrow(() -> new RuntimeException("Quiz not found"));

		if (principal == null || !quiz.getCreatedBy().getEmail().equals(principal.getName())) {
			return ResponseEntity.status(403).body("Not authorized");
		}

		service.deleteQuiz(id);
		return ResponseEntity.ok().build();
	}

	/**
	 * New endpoint: update quiz active status (Activate / Deactivate) Expects JSON:
	 * { "active": true | false }
	 */
	@PutMapping("/{id}/status")
	public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestBody Map<String, Object> body,
			Principal principal) {
		Optional<Quiz> quizOpt = repository.findById(id);
		if (quizOpt.isEmpty())
			return ResponseEntity.status(404).body(Map.of("message", "Quiz not found"));

		Quiz quiz = quizOpt.get();

		// Optionally enforce permission: only creator or admin can toggle
		if (principal == null || !quiz.getCreatedBy().getEmail().equals(principal.getName())) {
			// You can also allow admins - adjust as per your authorization logic
			// For now require creator
			return ResponseEntity.status(403).body(Map.of("message", "Not authorized to change quiz status"));
		}

		Boolean active = null;
		if (body.containsKey("active")) {
			Object v = body.get("active");
			if (v instanceof Boolean)
				active = (Boolean) v;
			else if (v instanceof String)
				active = Boolean.parseBoolean((String) v);
		}

		if (active == null)
			return ResponseEntity.badRequest().body(Map.of("message", "Missing 'active' boolean in body"));

		// Unbox Boolean to primitive boolean (Quiz.active is primitive)
		quiz.setActive(active);
		repository.save(quiz);

		return ResponseEntity.ok(quiz);
	}

	/**
	 * Public endpoint used by the frontend to decide which auth flow to show when
	 * navigating to /play/{code} BEFORE the user is logged in.
	 *
	 * GET /api/quizzes/code/{code}/creator-type Response: - 200 { "creatorType":
	 * "GENERAL" } - 200 { "creatorType": "INSTITUTE", "institutionId": 5,
	 * "institutionName": "Sharda University" } - 404 { "message": "Quiz not found"
	 * }
	 */
	@GetMapping("/code/{code}/creator-type")
	public ResponseEntity<?> getCreatorType(@PathVariable String code) {
		Optional<Quiz> quizOpt = repository.findByCode(code);
		if (quizOpt.isEmpty()) {
			return ResponseEntity.status(404).body(Map.of("message", "Quiz not found"));
		}

		Quiz quiz = quizOpt.get();
		User creator = quiz.getCreatedBy();

		// Safety: if no creator info, treat as GENERAL (you may change fallback to
		// INSTITUTE)
		if (creator == null) {
			return ResponseEntity.ok(Map.of("creatorType", "GENERAL"));
		}

		// If the creator explicitly has GENERAL_USER role -> GENERAL
		if (creator.getRoles() != null) {
			boolean isGeneral = creator.getRoles().stream()
					.anyMatch(r -> r != null && r.name().equalsIgnoreCase("GENERAL_USER"));
			if (isGeneral) {
				return ResponseEntity.ok(Map.of("creatorType", "GENERAL"));
			}
		}

		// If creator has an associated institution -> INSTITUTE (faculty-created)
		if (creator.getInstitution() != null) {
			return ResponseEntity.ok(Map.of("creatorType", "INSTITUTE", "institutionId",
					creator.getInstitution().getId(), "institutionName", creator.getInstitution().getInstituteName()));
		}

		// Optionally use userType
		if (creator.getUserType() != null && creator.getUserType().equalsIgnoreCase("GENERAL")) {
			return ResponseEntity.ok(Map.of("creatorType", "GENERAL"));
		}

		// If creator has TEACHER role, treat as institute
		if (creator.getRoles() != null) {
			boolean isTeacher = creator.getRoles().stream()
					.anyMatch(r -> r != null && r.name().equalsIgnoreCase("TEACHER"));
			if (isTeacher) {
				return ResponseEntity.ok(Map.of("creatorType", "INSTITUTE"));
			}
		}

		// Final fallback
		return ResponseEntity.ok(Map.of("creatorType", "GENERAL"));
	}

	@PutMapping("/{id}/settings")
	public ResponseEntity<?> updateQuizSettings(@PathVariable Long id, @RequestBody Map<String, Object> body,
			Principal principal) {
Quiz quiz = repository.findByIdWithCreator(id).orElseThrow(() -> new RuntimeException("Quiz not found"));

		// 🔐 Only creator can update
if (principal == null ||
quiz.getCreatedBy() == null ||
!quiz.getCreatedBy().getEmail().equals(principal.getName())) {

return ResponseEntity.status(403)
    .body(Map.of("message", "Not authorized to update quiz settings"));
}


		

		// 📝 BASIC INFO
		if (body.containsKey("title"))
			quiz.setTitle((String) body.get("title"));

		if (body.containsKey("description"))
			quiz.setDescription((String) body.get("description"));

		// ⏱ Timer
		if (body.containsKey("totalTimeMinutes") && body.get("totalTimeMinutes") != null) {
		    quiz.setTotalTimeMinutes(
		        ((Number) body.get("totalTimeMinutes")).intValue()
		    );
		}

		if (body.containsKey("perQuestionTimeSeconds") && body.get("perQuestionTimeSeconds") != null) {
		    quiz.setPerQuestionTimeSeconds(
		        ((Number) body.get("perQuestionTimeSeconds")).intValue()
		    );
		}


		// ⚙ Behavior
		if (body.containsKey("autoSubmit"))
			quiz.setAutoSubmit((Boolean) body.get("autoSubmit"));

		if (body.containsKey("shuffleQuestions"))
			quiz.setShuffleQuestions((Boolean) body.get("shuffleQuestions"));

		// 🛡 Proctoring
		if (body.containsKey("proctoringEnabled"))
			quiz.setProctoringEnabled((Boolean) body.get("proctoringEnabled"));

		// 🎓 Mode
		if (body.containsKey("quizMode"))
			quiz.setQuizMode((String) body.get("quizMode"));

		repository.save(quiz);
		return ResponseEntity.ok(Map.of("message", "Quiz updated successfully"));
	}

	@Transactional
	@GetMapping("/{id}/settings")
	public ResponseEntity<?> getQuizSettings(@PathVariable Long id, Principal principal) {

	    Optional<Quiz> quizOpt = repository.findByIdWithCreator(id);
	    if (quizOpt.isEmpty()) {
	        return ResponseEntity.status(404)
	                .body(Map.of("message", "Quiz not found"));
	    }

	    Quiz quiz = quizOpt.get();

	    // 🔐 Authorization
	    if (principal == null ||
	        quiz.getCreatedBy() == null ||
	        !quiz.getCreatedBy().getEmail().equals(principal.getName())) {

	        return ResponseEntity.status(403)
	                .body(Map.of("message", "Not authorized to view quiz settings"));
	    }

	    // ✅ IMPORTANT: HashMap allows null values
	    Map<String, Object> response = new java.util.HashMap<>();

	    response.put("title", quiz.getTitle());
	    response.put("description", quiz.getDescription());
	    response.put("totalTimeMinutes", quiz.getTotalTimeMinutes());
	    response.put("perQuestionTimeSeconds", quiz.getPerQuestionTimeSeconds());
	    response.put("autoSubmit", quiz.isAutoSubmit());
	    response.put("shuffleQuestions", quiz.isShuffleQuestions());
	    response.put("proctoringEnabled", quiz.isProctoringEnabled());
	    response.put("quizMode", quiz.getQuizMode());

	    return ResponseEntity.ok(response);
	}



	
	
	@PostMapping(value = "/create-with-import", consumes = "multipart/form-data")
	public ResponseEntity<?> createQuizWithImport(
	        @RequestParam String title,
	        @RequestParam(required = false) String description,
	        @RequestPart(required = false) MultipartFile file,
	        Principal principal
	) {
	    if (principal == null) {
	        return ResponseEntity.status(401).body("Unauthorized");
	    }

	    Quiz quiz = service.createQuiz(
	    	    title,
	    	    description,
	    	    principal.getName(),
	    	    "GENERAL"
	    	);

	    // 🧠 Optional import
	    if (file != null && !file.isEmpty()) {
	        service.importQuestionsFromFile(quiz, file);
	    }

	    return ResponseEntity.ok(quiz);
	}
	
	
	@GetMapping("/templates/{type}")
	public ResponseEntity<byte[]> downloadTemplate(@PathVariable String type) {

	    String content;
	    String filename;

	    if ("csv".equalsIgnoreCase(type)) {
	        filename = "quiz-question-template.csv";
	        content = "question,option1,option2,option3,option4,correctAnswer\n"
	                + "What is Java?,Language,OS,Browser,Database,Language\n"
	                + "2 + 2 = ?,1,2,3,4,4\n";
	    }
	    else if ("txt".equalsIgnoreCase(type)) {
	        filename = "quiz-question-template.txt";
	        content =
	                "What is Java?\n"
	              + "OPTIONS:\n"
	              + "Language\n"
	              + "OS\n"
	              + "Browser\n"
	              + "Database\n"
	              + "ANSWER: Language\n"
	              + "---\n"
	              + "2 + 2 = ?\n"
	              + "OPTIONS:\n"
	              + "1\n"
	              + "2\n"
	              + "3\n"
	              + "4\n"
	              + "ANSWER: 4\n";
	    }
	    else {
	        return ResponseEntity.badRequest().build();
	    }

	    return ResponseEntity.ok()
	        .header("Content-Disposition", "attachment; filename=" + filename)
	        .body(content.getBytes());
	}



}
