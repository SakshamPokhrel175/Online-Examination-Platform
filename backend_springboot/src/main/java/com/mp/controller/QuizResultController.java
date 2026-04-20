package com.mp.controller;

import com.mp.dto.ParticipantReportDTO;
import com.mp.dto.ReviewQuestionDTO;
import com.mp.entity.Question;
import com.mp.entity.Quiz;
import com.mp.entity.QuizResult;
import com.mp.entity.User;
import com.mp.repository.QuestionRepository;
import com.mp.repository.QuizRepository;
import com.mp.repository.QuizResultRepository;
import com.mp.repository.UserRepository;
import com.mp.service.PdfReportService;

import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.io.PrintWriter;
import java.security.Principal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/api/results")
public class QuizResultController {

	private final QuizResultRepository resultRepository;
	private final QuizRepository quizRepository;
	private final UserRepository userRepository;
	private final QuestionRepository questionRepository;
	private final PdfReportService pdfService;

	public QuizResultController(QuizResultRepository resultRepository, QuizRepository quizRepository,
			UserRepository userRepository, QuestionRepository questionRepository, PdfReportService pdfService) {
		this.resultRepository = resultRepository;
		this.quizRepository = quizRepository;
		this.userRepository = userRepository;
		this.questionRepository = questionRepository;
		this.pdfService = pdfService;
	}

	// ============================================================
	// 1. SUBMIT QUIZ (Student)
	// ============================================================
	@Transactional
	@PostMapping("/submit/{quizCode}")
	public ResponseEntity<?> submitQuiz(@PathVariable String quizCode, @RequestBody Map<Long, String> studentAnswers,
			Principal principal) {
		if (principal == null) {
			return ResponseEntity.status(401).build();
		}

		User student = userRepository.findByEmail(principal.getName()).orElse(null);
		Quiz quiz = quizRepository.findByCode(quizCode).orElse(null);

		if (student == null || quiz == null) {
			return ResponseEntity.badRequest().body("Invalid request");
		}

		// ================= RETAKE LOGIC =================
		QuizResult existing =
		    resultRepository.findByQuiz_IdAndUser_Email(
		        quiz.getId(),
		        student.getEmail()
		    ).orElse(null);

		int attemptNumber = 1;

		if (existing != null) {

		    if (!existing.isRetakeAllowed()) {
		        return ResponseEntity.status(403).body(
		            Map.of(
		                "reason", "RETAKE_NOT_ALLOWED",
		                "message", "Retake not allowed yet"
		            )
		        );
		    }

		    attemptNumber = existing.getAttemptNumber() + 1;

		    // 🔥 hard delete all old attempts
		    resultRepository.deleteByQuiz_IdAndUser_Email(
		        quiz.getId(),
		        student.getEmail()
		    );
		}

		/* =================================================
		   ✅ ADD THIS BLOCK HERE (VERY IMPORTANT)
		   ================================================= */
		studentAnswers.entrySet().removeIf(
		    e -> e.getValue() == null || e.getValue().isBlank()
		);

		/* ================= SCORE CALCULATION ================= */
		List<Question> questions = questionRepository.findByQuizId(quiz.getId());

		int score = 0;
		for (Question q : questions) {
		    if ("MCQ".equals(q.getType())) {
		        String selected = studentAnswers.get(q.getId());
		        if (selected != null && selected.equals(q.getCorrectAnswer())) {
		            score++;
		        }
		    }
		}


		QuizResult result = new QuizResult();
		result.setUser(student);
		result.setQuiz(quiz);
		result.setScore(score);
		result.setTotalQuestions(questions.size());
		result.setAttemptDate(LocalDateTime.now());
		result.setStatus(score >= (questions.size() / 2.0) ? "Pass" : "Fail");
		result.setAnswers(studentAnswers);
		result.setAttemptNumber(attemptNumber);
		result.setRetakeAllowed(false);
		result.setMaxAttempts(999);

		resultRepository.save(result); // ✅ REQUIRED

		return ResponseEntity
				.ok(Map.of("message", "Quiz submitted successfully", "attempt", attemptNumber, "score", score));

	}

	// ============================================================
	// 2. GET MY HISTORY (Student Dashboard)
	// ============================================================
	@GetMapping("/history")
	public ResponseEntity<List<HistoryDTO>> getMyHistory(Principal principal) {
		if (principal == null)
			return ResponseEntity.status(401).build();

		List<QuizResult> results = resultRepository.findByUserEmailOrderByAttemptDateDesc(principal.getName());

		List<HistoryDTO> dtos = results.stream().map(HistoryDTO::new).collect(Collectors.toList());

		return ResponseEntity.ok(dtos);
	}

	// ============================================================
	// 3. GET PARTICIPANTS (Teacher Dashboard)
	// ============================================================
	@GetMapping("/participants/{quizId}")
	public ResponseEntity<List<ParticipantReportDTO>> getParticipants(@PathVariable Long quizId, Principal principal) {

	    Quiz quiz = quizRepository.findById(quizId)
	            .orElseThrow(() -> new RuntimeException("Quiz not found"));

	    // 🔐 Teacher-only access
	    if (principal == null || 
	        !quiz.getCreatedBy().getEmail().equals(principal.getName())) {
	        return ResponseEntity.status(403).build();
	    }

	    List<QuizResult> results =
	            resultRepository.findByQuizIdOrderByScoreDesc(quizId);

	    List<ParticipantReportDTO> dtos = results.stream().map(r -> {
	        ParticipantReportDTO dto = new ParticipantReportDTO();
	        dto.resultId = r.getId();                       // ✅ THIS FIXES EVERYTHING
	        dto.studentName = r.getUser().getName();
	        dto.email = r.getUser().getEmail();
	        dto.score = r.getScore();
	        dto.totalQuestions = r.getTotalQuestions();
	        dto.percentage =
	        	    r.getTotalQuestions() == 0
	        	        ? 0
	        	        : Math.round((r.getScore() * 100.0) / r.getTotalQuestions());

	        dto.status = r.getStatus();
	        dto.attemptDate = r.getAttemptDate().toLocalDate();
	        return dto;
	    }).collect(Collectors.toList());

	    return ResponseEntity.ok(dtos);
	}

	// ============================================================
	// 3.1 PROFESSIONAL ANALYTICS (Teacher Dashboard)
	// Supports date filter + sorted latest first
	// ============================================================
	@GetMapping("/analytics/{quizId}")
	public ResponseEntity<?> analytics(@PathVariable Long quizId, @RequestParam(required = false) String from,
			@RequestParam(required = false) String to, Principal principal) {
		Quiz quiz = quizRepository.findById(quizId).orElseThrow(() -> new RuntimeException("Quiz not found"));

		if (principal == null || !quiz.getCreatedBy().getEmail().equals(principal.getName())) {
			return ResponseEntity.status(403).body("Not authorized");
		}

		LocalDateTime fromDate = null;
		LocalDateTime toDate = null;

		if (from != null && !from.isEmpty()) {
			fromDate = LocalDate.parse(from).atStartOfDay();
		}
		if (to != null && !to.isEmpty()) {
			toDate = LocalDate.parse(to).atTime(23, 59, 59);
		}

		List<QuizResult> results = (fromDate != null && toDate != null)
				? resultRepository.findByQuizIdAndAttemptDateBetween(quizId, fromDate, toDate)
				: resultRepository.findByQuizIdOrderByAttemptDateDesc(quizId);

		List<Map<String, Object>> response = results.stream().map(r -> {
		    Map<String, Object> map = new java.util.HashMap<>();

		    int attempted = r.getAnswers() != null ? r.getAnswers().size() : 0;
		    int correct = r.getScore();
		    int incorrect = Math.max(attempted - correct, 0);
		    int notAttempted = Math.max(r.getTotalQuestions() - attempted, 0);

		    map.put("resultId", r.getId());
		    map.put("name", r.getUser().getName());
		    map.put("email", r.getUser().getEmail());

		    map.put("score", correct);   // 👈 ADD THIS
		    map.put("correct", correct);
		    map.put("incorrect", incorrect);
		    map.put("attempted", attempted);
		    map.put("notAttempted", notAttempted);

		    map.put("totalQuestions", r.getTotalQuestions());
		    map.put(
		        "percentage",
		        r.getTotalQuestions() == 0
		            ? 0
		            : Math.round((correct * 100.0) / r.getTotalQuestions())
		    );

		    map.put("status", r.getStatus());
		    map.put("attemptDate", r.getAttemptDate());

		    return map;
		}).collect(Collectors.toList());


		return ResponseEntity.ok(response);
	}

//============================================================
//3.2 DOWNLOAD ANALYTICS REPORT (CSV)
//============================================================
	@GetMapping("/analytics/{quizId}/download")
	public void downloadReport(@PathVariable Long quizId, @RequestParam(required = false) String from,
			@RequestParam(required = false) String to, HttpServletResponse response, Principal principal)
			throws IOException {

		Quiz quiz = quizRepository.findById(quizId).orElseThrow(() -> new RuntimeException("Quiz not found"));

		if (principal == null || !quiz.getCreatedBy().getEmail().equals(principal.getName())) {
			response.sendError(HttpServletResponse.SC_FORBIDDEN);
			return;
		}

		LocalDateTime fromDate = null;
		LocalDateTime toDate = null;

		if (from != null && !from.isEmpty()) {
			fromDate = LocalDate.parse(from).atStartOfDay();
		}
		if (to != null && !to.isEmpty()) {
			toDate = LocalDate.parse(to).atTime(23, 59, 59);
		}

		List<QuizResult> results = (fromDate != null && toDate != null)
				? resultRepository.findByQuizIdAndAttemptDateBetween(quizId, fromDate, toDate)
				: resultRepository.findByQuizIdOrderByAttemptDateDesc(quizId);

		response.setContentType("text/csv");
		String safeTitle = quiz.getTitle().replaceAll("[^a-zA-Z0-9_-]", "_");

		response.setHeader("Content-Disposition",
				"attachment; filename=" + safeTitle + "_totalStudents(" + results.size() + ").csv");

		PrintWriter writer = response.getWriter();
		writer.println("Name,Email,Score,Total,Percentage,Status,Attempted On");

		for (QuizResult r : results) {
			int percentage = (int) Math.round((r.getScore() * 100.0) / r.getTotalQuestions());

			writer.printf("%s,%s,%d,%d,%d%%,%s,%s%n", r.getUser().getName(), r.getUser().getEmail(), r.getScore(),
					r.getTotalQuestions(), percentage, r.getStatus(), r.getAttemptDate());
		}

		writer.flush();
	}

	// ============================================================
	// 3.3 DOWNLOAD ANALYTICS REPORT (PDF)
	// ============================================================
	@GetMapping("/analytics/{quizId}/download-pdf")
	public void downloadPdf(@PathVariable Long quizId, @RequestParam(required = false) String from,
			@RequestParam(required = false) String to, HttpServletResponse response, Principal principal)
			throws Exception {

		Quiz quiz = quizRepository.findById(quizId).orElseThrow(() -> new RuntimeException("Quiz not found"));

		if (principal == null || !quiz.getCreatedBy().getEmail().equals(principal.getName())) {
			response.sendError(HttpServletResponse.SC_FORBIDDEN);
			return;
		}

		// 📅 DATE FILTERS (SAME AS CSV)
		LocalDateTime fromDate = null;
		LocalDateTime toDate = null;

		if (from != null && !from.isEmpty()) {
			fromDate = LocalDate.parse(from).atStartOfDay();
		}
		if (to != null && !to.isEmpty()) {
			toDate = LocalDate.parse(to).atTime(23, 59, 59);
		}

		List<QuizResult> results = (fromDate != null && toDate != null)
				? resultRepository.findByQuizIdAndAttemptDateBetween(quizId, fromDate, toDate)
				: resultRepository.findByQuizIdOrderByAttemptDateDesc(quizId);

		response.setContentType("application/pdf");
		String safeTitle = quiz.getTitle().replaceAll("[^a-zA-Z0-9_-]", "_");

		String filename = safeTitle + "_totalStudents(" + results.size() + ").pdf";

		response.setHeader("Content-Disposition", "attachment; filename=\"" + filename + "\"");

		pdfService.generate(response.getOutputStream(), quiz.getTitle(), results);
	}

	// ============================================================
	// 3.4 DOWNLOAD ANSWER SHEET PDF (Single Student)
	// ============================================================
	@GetMapping("/review/{resultId}/download-pdf")
	public void downloadAnswerSheetPdf(@PathVariable Long resultId, HttpServletResponse response, Principal principal) {

		try {
			// 🔐 AUTH CHECK
			if (principal == null) {
				response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized");
				return;
			}

			QuizResult result = resultRepository.findById(resultId)
					.orElseThrow(() -> new RuntimeException("Result not found"));

			String email = principal.getName();

			boolean isStudent = result.getUser().getEmail().equals(email);

			boolean isTeacher = result.getQuiz().getCreatedBy().getEmail().equals(email);

			if (!isStudent && !isTeacher) {
				response.sendError(HttpServletResponse.SC_FORBIDDEN, "Access denied");
				return;
			}

			// 📄 RESPONSE HEADERS
			response.setContentType("application/pdf");

			String studentName = result.getUser().getName().replaceAll("[^a-zA-Z0-9_-]", "_");
			String quizTitle = result.getQuiz().getTitle().replaceAll("[^a-zA-Z0-9_-]", "_");

			String filename = studentName + "_" + quizTitle + ".pdf";

			response.setHeader(
			    "Content-Disposition",
			    "attachment; filename=\"" + filename + "\""
			);


			// 🧾 GENERATE PDF
			pdfService.generateAnswerSheet(response.getOutputStream(), result);

		} catch (Exception e) {
			// 🔥 VERY IMPORTANT FOR DEBUGGING
			e.printStackTrace();

			try {
				response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "PDF generation failed");
			} catch (Exception ignored) {
			}
		}
	}

	// ============================================================
	// 4. GET REVIEW DETAILS (Review Modal)
	// ============================================================
	@GetMapping("/review/{resultId}")
	public ResponseEntity<?> getReviewDetails(@PathVariable Long resultId, Principal principal) {

	    if (principal == null) {
	        return ResponseEntity.status(401).build();
	    }

	    QuizResult result = resultRepository.findById(resultId)
	        .orElseThrow(() -> new RuntimeException("Result not found"));

	    String email = principal.getName();

	    boolean isStudent = result.getUser().getEmail().equals(email);
	    boolean isTeacher = result.getQuiz().getCreatedBy().getEmail().equals(email);

	    if (!isStudent && !isTeacher) {
	        return ResponseEntity.status(403).body("Access Denied");
	    }

	    // ✅ CREATE DTO FIRST
	    ReviewDTO dto = new ReviewDTO();

	    dto.resultId = result.getId();   // ✅ ADD THIS
	    dto.quizTitle = result.getQuiz().getTitle();
	    dto.quizCode = result.getQuiz().getCode();
	    dto.facultyName = result.getQuiz().getCreatedBy().getName();
	    dto.facultyEmail = result.getQuiz().getCreatedBy().getEmail();
	    dto.score = result.getScore();
	    dto.totalQuestions = result.getTotalQuestions();
	    dto.userAnswers = result.getAnswers();


	    // ✅ MAP QUESTIONS SAFELY
	    List<Question> questions =
	        questionRepository.findByQuizId(result.getQuiz().getId());

	    dto.questions = questions.stream().map(q -> {
	        ReviewQuestionDTO rq = new ReviewQuestionDTO();
	        rq.id = q.getId();
	        rq.content = q.getContent();
	        rq.type = q.getType();           // 🔥 THIS FIXES EVERYTHING
	        rq.options = q.getOptions();
	        rq.correctAnswer = q.getCorrectAnswer();

	        return rq;
	    }).collect(Collectors.toList());

	    // ✅ RETAKE INFO
	    dto.attemptNumber = result.getAttemptNumber();
	    dto.retakeAllowed = result.isRetakeAllowed();

	    return ResponseEntity.ok(dto);
	}

	@PostMapping("/review/{resultId}/allow-retake")
	public ResponseEntity<?> allowRetake(@PathVariable Long resultId, Principal principal) {

	    QuizResult result = resultRepository.findById(resultId)
	        .orElseThrow(() -> new RuntimeException("Result not found"));

	    if (!result.getQuiz().getCreatedBy().getEmail().equals(principal.getName())) {
	        return ResponseEntity.status(403).build();
	    }

	    if (result.isRetakeAllowed()) {
	        return ResponseEntity.badRequest()
	            .body(Map.of("message", "Retake already enabled"));
	    }

	    result.setRetakeAllowed(true);
	    resultRepository.save(result);

	    return ResponseEntity.ok(
	        Map.of(
	            "message", "Retake enabled",
	            "nextAttempt", result.getAttemptNumber() + 1
	        )
	    );
	}

	// ============================================================
	// DTOs
	// ============================================================

	public static class HistoryDTO {
	    public Long id;
	    public String quizTitle;
	    public String quizCode;

	    // ✅ NEW — quiz creator info
	    public String createdByName;
	    public String createdByEmail;

	    public int score;
	    public int totalQuestions;
	    public LocalDateTime dateAttempted;
	    public String status;

	    public boolean retakeAllowed;
	    public int attemptNumber;

	    public HistoryDTO(QuizResult r) {
	        this.id = r.getId();
	        this.quizTitle = r.getQuiz().getTitle();
	        this.quizCode = r.getQuiz().getCode();

	        // ✅ IMPORTANT
	        this.createdByName = r.getQuiz().getCreatedBy().getName();
	        this.createdByEmail = r.getQuiz().getCreatedBy().getEmail();

	        this.score = r.getScore();
	        this.totalQuestions = r.getTotalQuestions();
	        this.dateAttempted = r.getAttemptDate();
	        this.status = r.getStatus();
	        this.retakeAllowed = r.isRetakeAllowed();
	        this.attemptNumber = r.getAttemptNumber();
	    }
	}


//	public static class ParticipantDTO {
//		public String name;
//		public String email;
//		public int score;
//		public int totalQuestions;
//		public String date;
//
//		public ParticipantDTO(String name, String email, int score, int totalQuestions, String date) {
//			this.name = name;
//			this.email = email;
//			this.score = score;
//			this.totalQuestions = totalQuestions;
//			this.date = date;
//		}
//	}

	public static class ReviewDTO {
		public Long resultId; // ✅ ADD THIS
	    public String quizTitle;
	    public String quizCode;
	    public String facultyName;
	    public String facultyEmail;
	    public int score;
	    public int totalQuestions;

	    public int attemptNumber;
	    public boolean retakeAllowed;

	    public Map<Long, String> userAnswers;

	    // ❌ REMOVE THIS
	    // public List<Question> questions;

	    // ✅ ADD THIS
	    public List<ReviewQuestionDTO> questions;
	}


}