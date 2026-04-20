package com.mp.controller;

import com.mp.dto.UserDTO;
import com.mp.entity.Institution;
import com.mp.entity.Role;
import com.mp.entity.User;
import com.mp.repository.UserRepository;
import com.mp.security.JwtUtil;
import com.mp.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.*;

import java.lang.reflect.Method;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserService userService;
    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;

    public AuthController(UserService userService, UserRepository userRepository, JwtUtil jwtUtil, AuthenticationManager authenticationManager) {
        this.userService = userService;
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
        this.authenticationManager = authenticationManager;
    }

    /**
     * Register endpoint.
     * Prevents creation of ADMIN role from client side.
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest req) {
    	
        // 🔒 BACKEND HARD LOCK (NOT FRONTEND)
    	if (!List.of("GENERAL", "STUDENT", "FACULTY", "POOL").contains(req.userType)) {
            return ResponseEntity.badRequest().body(
                Map.of("message", "Invalid userType")
            );
        }
        
        if (req.roles != null && req.roles.stream().anyMatch(r -> r.equalsIgnoreCase("ADMIN"))) {
            Map<String, String> body = Collections.singletonMap("message", "Creating ADMIN via public register is not allowed.");
            return ResponseEntity.badRequest().body(body);
        }

        Set<Role> roles = (req.roles == null || req.roles.isEmpty())
                ? Set.of(Role.GENERAL_USER)
                : req.roles.stream()
                    .map(String::trim)
                    .filter(s -> !s.equalsIgnoreCase("ADMIN"))
                    .map(Role::valueOf)
                    .collect(Collectors.toSet());
        
     // 🔒 FORCE POOL ROLE
        if ("POOL".equalsIgnoreCase(req.userType)) {
            roles = Set.of(Role.POOL_USER);
        }

        try {
            UserDTO created = userService.create(req.email, req.name, req.password, roles, req.userType, req.institutionId);
            return ResponseEntity.ok(created);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest()
                .body(Map.of("message", ex.getMessage()));
        }

    }

    /**
     * Login endpoint. Returns token + email + roles on success.
     * Optional: if LoginRequest.institutionId is provided, server will verify that the user belongs to that institution.
     */
//    @PostMapping("/login")
//    public ResponseEntity<?> login(@RequestBody LoginRequest req) {
//        try {
//            authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(req.email, req.password));
//            var userOpt = userRepository.findByEmail(req.email);
//            if (userOpt.isEmpty()) {
//                return ResponseEntity.status(401).body(Collections.singletonMap("message", "User not found after authentication"));
//            }
//            User user = userOpt.get();
//
//            // If client provided an institutionId, enforce it server-side
//            Institution inst = user.getInstitution();
//            if (inst != null && inst.getAllowedDomains() != null) {
//                String emailDomain = user.getEmail().split("@")[1];
//
//                boolean allowed = inst.getAllowedDomains()
//                    .stream()
//                    .anyMatch(d -> d.equalsIgnoreCase(emailDomain));
//
//                if (!allowed) {
//                    return ResponseEntity.status(403)
//                        .body(Map.of(
//                            "message",
//                            "Your email domain is not allowed for this institution. Please contact your administrator."
//                        ));
//                }
//
//            }
//
//            if (req.institutionId != null) {
//                Long registeredInstId = extractInstitutionId(user); // helper below
//                if (registeredInstId == null) {
//                    return ResponseEntity.status(403).body(Collections.singletonMap("message", "Account is not associated with any institution"));
//                }
//                if (!registeredInstId.equals(req.institutionId)) {
//                    String msg = String.format("This account is registered with institution id=%d. Please choose the correct institution.",
//                            registeredInstId);
//                    return ResponseEntity.status(403).body(Collections.singletonMap("message", msg));
//                }
//            }
//
//            Set<String> roleNames = user.getRoles() == null
//            	    ? Set.of()
//            	    : user.getRoles().stream().map(Enum::name).collect(Collectors.toSet());
//
//            	String institutionName = user.getInstitution() != null
//            	    ? user.getInstitution().getInstituteName()
//            	    : null;
//
//            	Long institutionId = user.getInstitution() != null
//            	    ? user.getInstitution().getId()
//            	    : null;
//
//            	String token = jwtUtil.generateToken(
//            	    user.getEmail(),
//            	    roleNames
//            	);
//
//            	return ResponseEntity.ok(
//            	    new LoginResponse(
//            	        token,
//            	        user.getEmail(),
//            	        roleNames,
//            	        user.getUserType(),
//            	        institutionId,
//            	        institutionName
//            	    )
//            	);
//        } catch (AuthenticationException ex) {
//            return ResponseEntity.status(401).body(Collections.singletonMap("message", "Invalid credentials"));
//        } catch (Exception ex) {
//            return ResponseEntity.status(500).body(Collections.singletonMap("message", "Server error during authentication"));
//        }
//    }

    /**
     * New endpoint: verify that an email belongs to an institution.
     * Request: { "email": "...", "institutionId": 123 }
     * Response: { "ok": true } or { "ok": false, "message": "..." }
     */
    @PostMapping("/verify-institution")
    public ResponseEntity<?> verifyInstitution(@RequestBody VerifyInstitutionRequest req) {
        if (req.email == null || req.email.isBlank() || req.institutionId == null) {
            return ResponseEntity.badRequest().body(Map.of("ok", false, "message", "email and institutionId are required"));
        }

        Optional<User> userOpt = userRepository.findByEmail(req.email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.ok(Map.of("ok", false, "message", "Account not found"));
        }

        User user = userOpt.get();
        Long registeredInstId = extractInstitutionId(user);
        if (registeredInstId == null) {
            return ResponseEntity.ok(Map.of("ok", false, "message", "This account is not associated with any institution"));
        }

        if (registeredInstId.equals(req.institutionId)) {
            return ResponseEntity.ok(Map.of("ok", true, "institutionId", registeredInstId));
        } else {
            // Optionally, include institution name if available for friendlier message
            String registeredName = extractInstitutionName(user);
            String msg = registeredName != null
                    ? String.format("This account is registered with %s. Please choose that institute to login.", registeredName)
                    : String.format("This account is registered with institution id=%d. Please choose the correct institute.", registeredInstId);
            return ResponseEntity.ok(Map.of("ok", false, "message", msg, "institutionId", registeredInstId));
        }
    }

    // DTOs for auth requests/responses
    public static class RegisterRequest {
        public String email;
        public String name;
        public String password;
        public Set<String> roles; // optional, e.g. ["TEACHER"]
        public String userType;
        public Long institutionId;
    }

    public static class LoginRequest {
        public String email;
        public String password;
        // OPTIONAL — if frontend sends institutionId to enforce matching on login:
        public Long institutionId;
    }

    public static record LoginResponse(
    	    String token,
    	    String email,
    	    Set<String> roles,
    	    String userType,
    	    Long institutionId,
    	    String institutionName
    	) {}

    public static class VerifyInstitutionRequest {
        public String email;
        public Long institutionId;
    }

    // -----------------------
    // Helper utilities
    // -----------------------

    /**
     * Attempts to extract the institution id from the User object.
     * Supports either:
     *  - User.getInstitutionId() returning Long / Integer
     *  - User.getInstitution().getId() where getInstitution returns an Institution entity
     *
     * If neither is available, returns null.
     */
    private Long extractInstitutionId(User user) {
        try {
            // try getInstitutionId() first
            Method m = user.getClass().getMethod("getInstitutionId");
            Object v = m.invoke(user);
            if (v instanceof Number) {
                return ((Number) v).longValue();
            }
        } catch (NoSuchMethodException ignore) {
            // continue to next attempt
        } catch (Exception ex) {
            // reflection error - log and continue
            System.err.println("extractInstitutionId reflection error: " + ex.getMessage());
        }

        try {
            // try getInstitution().getId()
            Method m2 = user.getClass().getMethod("getInstitution");
            Object institutionObj = m2.invoke(user);
            if (institutionObj != null) {
                Method getId = institutionObj.getClass().getMethod("getId");
                Object idVal = getId.invoke(institutionObj);
                if (idVal instanceof Number) {
                    return ((Number) idVal).longValue();
                }
            }
        } catch (NoSuchMethodException ignore) {
            // not present - give up
        } catch (Exception ex) {
            System.err.println("extractInstitutionId reflection error 2: " + ex.getMessage());
        }

        // If your User has different field or naming, adjust here
        return null;
    }

    /**
     * Try to extract the institution name for friendlier messages.
     * Returns null if not available.
     */
    private String extractInstitutionName(User user) {
        try {
            Method m = user.getClass().getMethod("getInstitution");
            Object institutionObj = m.invoke(user);
            if (institutionObj != null) {
                // Try common getters
                try {
                    Method getName = institutionObj.getClass().getMethod("getInstituteName");
                    Object nameVal = getName.invoke(institutionObj);
                    if (nameVal != null) return nameVal.toString();
                } catch (NoSuchMethodException ignore) {}

                try {
                    Method getName2 = institutionObj.getClass().getMethod("getInstitute_name");
                    Object nameVal2 = getName2.invoke(institutionObj);
                    if (nameVal2 != null) return nameVal2.toString();
                } catch (NoSuchMethodException ignore) {}
            }
        } catch (Exception ignored) {}
        return null;
    }
    
    
    
    private ResponseEntity<?> authenticateAndValidateType(
            LoginRequest req,
            String expectedUserType
    ) {
        try {
            authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.email, req.password)
            );

            User user = userRepository.findByEmail(req.email)
                .orElseThrow(() -> new RuntimeException("User not found"));

            // 🔒 HARD BLOCK: wrong login type
            if (!expectedUserType.equalsIgnoreCase(user.getUserType())) {
                return ResponseEntity.status(403).body(
                    Map.of(
                        "message",
                        "This account is registered as " + user.getUserType()
                        + ". Please use the correct login page."
                    )
                );
            }

            Set<String> roleNames = user.getRoles()
                .stream().map(Enum::name).collect(Collectors.toSet());

            String token = jwtUtil.generateToken(user.getEmail(), roleNames);

            return ResponseEntity.ok(
                new LoginResponse(
                    token,
                    user.getEmail(),
                    roleNames,
                    user.getUserType(),
                    user.getInstitution() != null ? user.getInstitution().getId() : null,
                    user.getInstitution() != null ? user.getInstitution().getInstituteName() : null
                )
            );

        } catch (AuthenticationException e) {
            return ResponseEntity.status(401)
                .body(Map.of("message", "Invalid credentials"));
        }
    }
    
    
    @PostMapping("/login/general")
    public ResponseEntity<?> loginGeneral(@RequestBody LoginRequest req) {
        return authenticateAndValidateType(req, "GENERAL");
    }

    @PostMapping("/login/student")
    public ResponseEntity<?> loginStudent(@RequestBody LoginRequest req) {
        return authenticateAndValidateType(req, "STUDENT");
    }

    @PostMapping("/login/faculty")
    public ResponseEntity<?> loginFaculty(@RequestBody LoginRequest req) {
        return authenticateAndValidateType(req, "FACULTY");
    }
    @PostMapping("/login/admin")
    public ResponseEntity<?> loginAdmin(@RequestBody LoginRequest req) {
        return authenticateAndValidateType(req, "ADMIN");
    }


    @PostMapping("/login")
    public ResponseEntity<?> loginBlocked() {
        return ResponseEntity.status(400).body(
            Map.of(
                "message",
                "Please use role-specific login endpoints: /login/general, /login/student, /login/faculty"
            )
        );
    }

    
    
    
    
    @PostMapping("/login/pool")
    public ResponseEntity<?> loginPool(@RequestBody LoginRequest req) {
        return authenticateAndValidateType(req, "POOL");
    }


}