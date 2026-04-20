package com.mp.config;

import com.mp.entity.Role;
import com.mp.entity.User;
import com.mp.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

@Configuration
public class DataInitializer {

	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;

	public DataInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder) {
		this.userRepository = userRepository;
		this.passwordEncoder = passwordEncoder;
	}

	@Bean
	public CommandLineRunner createAdminUser() {
		return args -> {
			// ✅ UNCOMMENT THIS LINE: Re-enable admin creation logic
			this.createAdminIfMissing();
			// System.out.println("--- Admin check temporarily disabled for startup
			// stability ---"); // DELETE or keep as comment
		};
	}
	// ... (rest of the file remains the same)}

	@Transactional
	public void createAdminIfMissing() {
		String adminEmail = "admin@gmail.com";
		String adminPassword = "admin@gmail.com";

		try {
			if (userRepository.findByEmail(adminEmail).isEmpty()) {
				User admin = User.builder().email(adminEmail).name("System Admin")
						.password(passwordEncoder.encode(adminPassword)).roles(Set.of(Role.ADMIN)).userType("ADMIN")
						.active(true).emailVerified(true).build();

				userRepository.save(admin);
				System.out.println("Created admin user: " + adminEmail);
			} else {
				System.out.println("Admin user already exists: " + adminEmail);
			}
		} catch (Exception e) {
			// Suppress the exception to allow the application to finish DDL
			if (e.getMessage().contains("users' doesn't exist")) {
				System.err.println("WARNING: Admin user check skipped on startup due to schema creation timing.");
			} else {
				System.err.println("FATAL ERROR during data initialization: " + e.getMessage());
				throw new RuntimeException(e);
			}
		}
	}
}