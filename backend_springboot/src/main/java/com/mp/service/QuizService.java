package com.mp.service;

import com.mp.entity.Question;
import com.mp.entity.Quiz;
import com.mp.entity.User;
import com.mp.repository.QuestionRepository;
import com.mp.repository.QuizRepository;
import com.mp.repository.UserRepository; // ✅ Import UserRepository
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;

@Service
public class QuizService {
	private final QuizRepository repository;
	private final UserRepository userRepository; // ✅ Inject UserRepository
	private final QuestionRepository questionRepository;

	public QuizService(QuizRepository repository, UserRepository userRepository,
			QuestionRepository questionRepository) {
		this.repository = repository;
		this.userRepository = userRepository;
		this.questionRepository = questionRepository;
	}

	// ✅ UPDATED: Get only quizzes for the logged-in user
	public List<Quiz> getQuizzesByUser(String email) {
		return repository.findByCreatedByEmail(email);
	}

	// ✅ UPDATED: Save quiz with the creator
	public Quiz createQuiz(String title, String description, String email, String creatorType) {

	    // ✅ Find creator user
	    User creator = userRepository.findByEmail(email)
	            .orElseThrow(() -> new RuntimeException("User not found"));

	    // ✅ Generate unique quiz code
	    String uniqueCode = Long.toHexString(
	            Double.doubleToLongBits(Math.random())
	    ).substring(0, 6).toUpperCase();

	    // ✅ Create quiz
	    Quiz quiz = new Quiz(title, description, uniqueCode, creator);

	    // ✅ IMPORTANT: Set creator type
	    quiz.setCreatorType(creatorType);

	    return repository.save(quiz);
	}


	public void deleteQuiz(Long id) {
		repository.deleteById(id);
	}

	public void importQuestionsFromFile(Quiz quiz, MultipartFile file) {

		String filename = file.getOriginalFilename();
		if (filename == null)
			return;

		try {
			if (filename.endsWith(".txt")) {
				importFromTxt(quiz, file);
			} else if (filename.endsWith(".csv")) {
				importFromCsv(quiz, file);
			} else {
				throw new RuntimeException("Unsupported file format");
			}
		} catch (Exception e) {
			throw new RuntimeException("Failed to import questions: " + e.getMessage());
		}
	}

	private void importFromTxt(Quiz quiz, MultipartFile file) throws IOException {

	    BufferedReader reader = new BufferedReader(
	        new InputStreamReader(file.getInputStream())
	    );

	    String line;
	    List<String> buffer = new ArrayList<>();
	    int imported = 0;

	    while ((line = reader.readLine()) != null) {
	        if (line.trim().equals("---")) {
	            if (saveMcqQuestion(quiz, buffer)) {
	                imported++;
	            }
	            buffer.clear();
	        } else {
	            buffer.add(line);
	        }
	    }

	    if (!buffer.isEmpty()) {
	        if (saveMcqQuestion(quiz, buffer)) {
	            imported++;
	        }
	    }

	    quiz.setQuestionsCount(quiz.getQuestionsCount() + imported);
	    repository.save(quiz);
	}


	private boolean saveMcqQuestion(Quiz quiz, List<String> data) {
	    if (data.size() < 7) return false;

	    Question q = new Question();
	    q.setQuiz(quiz);
	    q.setType("MCQ");
	    q.setContent(data.get(0));
	    q.setOptions(data.subList(2, 6));

	    String answerLine = data.get(6);
	    q.setCorrectAnswer(answerLine.replace("ANSWER:", "").trim());

	    questionRepository.save(q);
	    return true;
	}


	private void importFromCsv(Quiz quiz, MultipartFile file) throws IOException {

	    BufferedReader reader = new BufferedReader(
	        new InputStreamReader(file.getInputStream())
	    );

	    String line;
	    boolean header = true;
	    int imported = 0;

	    while ((line = reader.readLine()) != null) {
	        if (header) {
	            header = false;
	            continue;
	        }

	        String[] parts = line.split(",", -1); // 🔥 IMPORTANT
	        if (parts.length < 6) continue;

	        Question q = new Question();
	        q.setQuiz(quiz);
	        q.setType("MCQ");
	        q.setContent(parts[0].trim());
	        q.setOptions(List.of(
	            parts[1].trim(),
	            parts[2].trim(),
	            parts[3].trim(),
	            parts[4].trim()
	        ));
	        q.setCorrectAnswer(parts[5].trim());

	        questionRepository.save(q);
	        imported++;
	    }

	    // 🔥 UPDATE COUNT
	    quiz.setQuestionsCount(quiz.getQuestionsCount() + imported);
	    repository.save(quiz);
	}

}