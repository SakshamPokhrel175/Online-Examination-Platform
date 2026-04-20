package com.mp.controller;

import com.mp.dto.ProctoringAlertDTO;
import com.mp.entity.User;
import com.mp.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.bytedeco.opencv.global.opencv_imgcodecs;
import org.bytedeco.opencv.global.opencv_imgproc;
import org.bytedeco.opencv.opencv_core.Mat;
import org.bytedeco.opencv.opencv_core.RectVector;
import org.bytedeco.opencv.opencv_objdetect.CascadeClassifier;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.Principal;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/proctor")
public class ProctoringController {

    private final Path uploadsRoot = Path.of("uploads", "proctoring");
    private final UserRepository userRepository;
    private final CascadeClassifier faceDetector;
    private final boolean detectorEnabled;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final ProctoringWebSocketController wsController;

    public ProctoringController(UserRepository userRepository,
            ProctoringWebSocketController wsController) {
this.userRepository = userRepository;
this.wsController = wsController;
        // ensure root exists
        try {
            if (!Files.exists(uploadsRoot)) {
                Files.createDirectories(uploadsRoot);
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
        // read feature flag
        boolean enabled = true;
        try {
            String env = System.getenv("PROCTOR_FACE_DETECTOR_ENABLED");
            if (env != null) {
                enabled = Boolean.parseBoolean(env.trim());
            } else {
                String prop = System.getProperty("proctor.face.detector.enabled");
                if (prop != null) enabled = Boolean.parseBoolean(prop.trim());
            }
        } catch (Exception ex) {
            // ignore
        }
        this.detectorEnabled = enabled;

        CascadeClassifier detector = null;
        if (this.detectorEnabled) {
            try {
                String resourceName = "/haarcascade_frontalface_alt.xml";
                InputStream is = getClass().getResourceAsStream(resourceName);
                if (is != null) {
                    Path tmp = Files.createTempFile("haarcascade-", ".xml");
                    Files.copy(is, tmp, StandardCopyOption.REPLACE_EXISTING);
                    detector = new CascadeClassifier(tmp.toAbsolutePath().toString());
                } else {
                    System.err.println("haarcascade resource not found on classpath: " + resourceName);
                }
            } catch (Throwable t) {
                System.err.println("Failed to initialize OpenCV face detector: " + t.getClass().getName() + " : " + t.getMessage());
                t.printStackTrace();
                detector = null;
            }
        } else {
            System.out.println("PROCTOR_FACE_DETECTOR_ENABLED is false — skipping OpenCV initialization.");
        }
        this.faceDetector = detector;
    }

    @PostMapping("/capture")
    public ResponseEntity<?> capture(@RequestParam(value = "capture", required = false) MultipartFile capture,
                                     @RequestParam(value = "quizCode", required = false) String quizCode,
                                     @RequestParam(value = "session", required = false) String session,
                                     @RequestParam(value = "evidence", required = false, defaultValue = "false") boolean evidence,
                                     @RequestParam(value = "violationType", required = false) String violationType,
                                     Principal principal) {
        try {
            if (principal == null) {
                return ResponseEntity.status(401).body(Map.of("status", "unauthenticated"));
            }
            if (capture == null || capture.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("status", "error", "reason", "no_file"));
            }

            String username = principal.getName().replaceAll("[^a-zA-Z0-9@._-]", "_");
            long ts = Instant.now().toEpochMilli();

            // Build user directory; if session provided, create session subfolder
            Path userDir = uploadsRoot.resolve(username);
            if (session != null && !session.isBlank()) {
                String safeSession = session.replaceAll("[^a-zA-Z0-9@._\\-]", "_");
                userDir = userDir.resolve(safeSession);
            }

            if (!Files.exists(userDir)) Files.createDirectories(userDir);

            String safeQuiz = (quizCode != null && !quizCode.isBlank()) ? quizCode.replaceAll("[^a-zA-Z0-9_-]", "_") : "unknown";
            String prefix = evidence ? "evidence" : "capture";
            String fileName = String.format("%s-%s-%d.jpg", prefix, safeQuiz, ts);
            Path out = userDir.resolve(fileName);

            try (InputStream in = capture.getInputStream()) {
                Files.copy(in, out, StandardCopyOption.REPLACE_EXISTING);
            }

            if (faceDetector == null || faceDetector.empty()) {
                if (evidence) writeMetadataSidecar(userDir, fileName, ts, violationType, true);
                return ResponseEntity.ok(Map.of("status", "saved", "file", username + "/" + (session != null ? session + "/" : "") + fileName, "warning", "no_face_detector_available"));
            }

            Mat img = opencv_imgcodecs.imread(out.toAbsolutePath().toString());
            if (img == null || img.empty()) {
                Files.deleteIfExists(out);
                return ResponseEntity.status(500).body(Map.of("status", "error", "reason", "invalid_image"));
            }

            Mat gray = new Mat();
            opencv_imgproc.cvtColor(img, gray, opencv_imgproc.COLOR_BGR2GRAY);

            RectVector faces = new RectVector();
            faceDetector.detectMultiScale(gray, faces);

            long faceCount = faces.size();
         // 🔥 REAL-TIME ALERT (NO FACE DETECTED)
            if (faceCount == 0) {

                ProctoringAlertDTO alert = new ProctoringAlertDTO(
                        safeQuiz,
                        username,
                        "No face detected",
                        true
                );

                wsController.sendAlert(safeQuiz, alert);
            }
            if (faceCount > 1) {
                wsController.sendAlert(safeQuiz,
                    new ProctoringAlertDTO(safeQuiz, username, "Multiple faces detected", true));
            }
            
            if (faceCount == 0 && !evidence) {
                Files.deleteIfExists(out);
                return ResponseEntity.status(422).body(Map.of("status", "rejected", "reason", "no_face_detected"));
            }

            if (evidence) {
                writeMetadataSidecar(userDir, fileName, ts, violationType, false);
            }

            return ResponseEntity.ok(Map.of("status", "saved", "file", username + "/" + (session != null ? session + "/" : "") + fileName, "faces", faceCount));
        } catch (IOException ex) {
            ex.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("status", "error", "reason", "io_exception", "message", ex.getMessage()));
        } catch (Throwable ex) {
            ex.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("status", "error", "reason", "exception", "message", ex.getMessage()));
        }
    }

    private void writeMetadataSidecar(Path userDir, String fileName, long ts, String violationType, boolean detectorUnavailable) {
        try {
            Map<String, Object> meta = new LinkedHashMap<>();
            meta.put("file", fileName);
            meta.put("timestamp", ts);
            meta.put("violationType", violationType == null ? "unspecified" : violationType);
            meta.put("detectorUnavailable", detectorUnavailable);
            String json = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(meta);
            Path metaFile = userDir.resolve(fileName + ".json");
            Files.writeString(metaFile, json, StandardCharsets.UTF_8, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
        } catch (Exception e) {
            System.err.println("Failed to write metadata sidecar for " + fileName);
            e.printStackTrace();
        }
    }

    @GetMapping("/list")
    public ResponseEntity<?> listCaptures(@RequestParam(value = "user", required = false) String userFilter,
                                          @RequestParam(value = "quizCode", required = false) String quizFilter,
                                          Principal principal) {
        try {
            if (principal == null) {
                return ResponseEntity.status(401).body(Map.of("status", "unauthenticated"));
            }

            Optional<User> userOpt = userRepository.findByEmail(principal.getName());
            if (userOpt.isEmpty()) return ResponseEntity.status(401).body(Map.of("status", "unauthenticated"));
            User me = userOpt.get();
            boolean allowed = me.getRoles().stream().anyMatch(r -> r.name().equalsIgnoreCase("TEACHER") || r.name().equalsIgnoreCase("ADMIN"));
            if (!allowed) {
                return ResponseEntity.status(403).body(Map.of("status", "forbidden"));
            }

            if (!Files.exists(uploadsRoot)) return ResponseEntity.ok(Collections.emptyList());

            List<Map<String, Object>> result = new ArrayList<>();

            try (DirectoryStream<Path> ds = Files.newDirectoryStream(uploadsRoot)) {
                for (Path userDir : ds) {
                    if (!Files.isDirectory(userDir)) continue;
                    String username = userDir.getFileName().toString();
                    if (userFilter != null && !userFilter.isBlank()) {
                        if (!username.toLowerCase().contains(userFilter.toLowerCase())) continue;
                    }

                    List<String> files = Files.list(userDir)
                            .filter(Files::isRegularFile)
                            .map(p -> p.getFileName().toString())
                            .filter(fname -> {
                                if (quizFilter == null || quizFilter.isBlank()) return true;
                                return fname.toLowerCase().contains(quizFilter.toLowerCase());
                            })
                            .sorted(Comparator.reverseOrder())
                            .collect(Collectors.toList());

                    if (!files.isEmpty()) {
                        result.add(Map.of("user", username, "files", files));
                    }
                }
            }

            return ResponseEntity.ok(result);
        } catch (IOException ex) {
            ex.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("status", "error"));
        }
    }

    @GetMapping("/file")
    public ResponseEntity<Resource> getFile(@RequestParam("user") String user,
                                            @RequestParam("name") String name,
                                            Principal principal) {
        try {
            if (principal == null) {
                return ResponseEntity.status(401).build();
            }

            Optional<User> userOpt = userRepository.findByEmail(principal.getName());
            if (userOpt.isEmpty()) return ResponseEntity.status(401).build();
            User me = userOpt.get();
            boolean allowed = me.getRoles().stream().anyMatch(r -> r.name().equalsIgnoreCase("TEACHER") || r.name().equalsIgnoreCase("ADMIN"));
            if (!allowed) {
                return ResponseEntity.status(403).build();
            }

            String safeUser = user.replaceAll("[^a-zA-Z0-9@._-]", "_");
            String safeName = name.replaceAll("[/\\\\]", "");
            Path file = uploadsRoot.resolve(safeUser).resolve(safeName);
            if (!Files.exists(file) || !Files.isRegularFile(file)) {
                return ResponseEntity.notFound().build();
            }

            String contentType = Files.probeContentType(file);
            InputStreamResource resource = new InputStreamResource(Files.newInputStream(file, StandardOpenOption.READ));

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + safeName + "\"")
                    .contentLength(Files.size(file))
                    .contentType(contentType != null ? MediaType.parseMediaType(contentType) : MediaType.APPLICATION_OCTET_STREAM)
                    .body(resource);
        } catch (IOException ex) {
            ex.printStackTrace();
            return ResponseEntity.status(500).build();
        }
    }
}