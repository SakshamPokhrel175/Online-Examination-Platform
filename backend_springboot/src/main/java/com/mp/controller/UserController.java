package com.mp.controller;

import com.mp.dto.UserDTO;
import com.mp.entity.User;
import com.mp.repository.UserRepository;
import com.mp.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.security.Principal;
import java.util.List;
import java.util.Objects;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    
    // Directory to store user profile images
    private static final String UPLOAD_DIR = "uploads/users";

    // Constructor injection for all dependencies
    public UserController(UserService userService, UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userService = userService;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // ============================================================
    // ADMIN ENDPOINTS (Existing)
    // ============================================================

    @GetMapping
    public List<UserDTO> all() {
        return userService.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(userService.findById(id));
    }

    @PostMapping
    public ResponseEntity<UserDTO> create(@RequestBody CreateUserRequest req) {
        var dto = userService.create(req.email, req.name, req.password, req.rolesAsEnum(), req.userType, req.institutionId);
        return ResponseEntity.created(URI.create("/api/users/" + dto.getId())).body(dto);
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserDTO> update(@PathVariable Long id, @RequestBody UserDTO dto) {
        return ResponseEntity.ok(userService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        userService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ============================================================
    // USER PROFILE ENDPOINTS (New Features)
    // ============================================================

    /**
     * Get the currently logged-in user's details.
     * Replaces the old "me" method that only returned a string.
     */
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(Principal principal) {
        if (principal == null) return ResponseEntity.status(401).build();
        
        // ✅ FIX: Return the User Entity directly (now that @JsonIgnoreProperties is added)
        // OR better yet, use your DTO logic if you have a mapper available.
        // For now, the Entity fix in Step 1 makes this safe.
        return userRepository.findByEmail(principal.getName())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    /**
     * Update Profile Name and Upload Image.
     * Uses MultipartFile for image upload.
     */
    @PutMapping("/me")
    public ResponseEntity<?> updateProfile(
            Principal principal,
            @RequestParam("name") String name,
            @RequestParam(value = "profileImage", required = false) MultipartFile file
    ) {
        User user = userRepository.findByEmail(principal.getName()).orElse(null);
        if (user == null) return ResponseEntity.status(404).body("User not found");

        // Update Name
        user.setName(name);

        // Update Image if provided
        if (file != null && !file.isEmpty()) {

            // ================= SAFETY CHECKS (ADD HERE) =================

            // 1️⃣ Size check (500MB)
            if (file.getSize() > 500L * 1024 * 1024) {
                return ResponseEntity.badRequest().body("File too large (max 500MB)");
            }

            // 2️⃣ Type check (only images)
            if (file.getContentType() == null ||
                !file.getContentType().startsWith("image/")) {
                return ResponseEntity.badRequest().body("Only image files are allowed");
            }

            // ============================================================

            try {
                String fileName = StringUtils.cleanPath(
                        Objects.requireNonNull(file.getOriginalFilename())
                );

                // Add timestamp to avoid collisions & caching issues
                String uniqueFileName = System.currentTimeMillis() + "_" + fileName;

                Path uploadPath = Paths.get(UPLOAD_DIR);
                if (!Files.exists(uploadPath)) {
                    Files.createDirectories(uploadPath);
                }

                Path filePath = uploadPath.resolve(uniqueFileName);
                Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

                // Save relative path in DB
                user.setProfileImageUrl(UPLOAD_DIR + "/" + uniqueFileName);

            } catch (IOException e) {
                return ResponseEntity.internalServerError()
                        .body("Image upload failed: " + e.getMessage());
            }
        }

        userRepository.save(user);
        return ResponseEntity.ok(user);
    }

    /**
     * Change Password logic with verification.
     */
    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(Principal principal, @RequestBody PasswordChangeRequest req) {
        User user = userRepository.findByEmail(principal.getName()).orElse(null);
        if (user == null) return ResponseEntity.status(404).body("User not found");

        // 1. Verify old password
        if (!passwordEncoder.matches(req.currentPassword, user.getPassword())) {
            return ResponseEntity.badRequest().body("Incorrect current password");
        }

        // 2. Verify new password match
        if (!req.newPassword.equals(req.confirmPassword)) {
            return ResponseEntity.badRequest().body("New passwords do not match");
        }

        // 3. Update password
        user.setPassword(passwordEncoder.encode(req.newPassword));
        userRepository.save(user);
        return ResponseEntity.ok("Password updated successfully");
    }

    // ============================================================
    // DTOs
    // ============================================================

    // Request class for creating user (Admin use)
    public static class CreateUserRequest {
        public String email;
        public String name;
        public String password;
        public java.util.Set<String> roles;
        public String userType;
        public Long institutionId;

        public java.util.Set<com.mp.entity.Role> rolesAsEnum() {
            if (roles == null) return null;
            return roles.stream().map(com.mp.entity.Role::valueOf).collect(java.util.stream.Collectors.toSet());
        }
    }

    // Request class for changing password (User use)
    public static class PasswordChangeRequest {
        public String currentPassword;
        public String newPassword;
        public String confirmPassword;
    }
}