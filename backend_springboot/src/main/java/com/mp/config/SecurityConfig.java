package com.mp.config;

import com.mp.security.CustomUserDetailsService;
import com.mp.security.JwtAuthenticationFilter;
import com.mp.security.JwtUtil;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.Ordered;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.List;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private final CustomUserDetailsService userDetailsService;
    private final JwtUtil jwtUtil;

    public SecurityConfig(CustomUserDetailsService userDetailsService, JwtUtil jwtUtil) {
        this.userDetailsService = userDetailsService;
        this.jwtUtil = jwtUtil;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public DaoAuthenticationProvider daoAuthenticationProvider() {
        DaoAuthenticationProvider prov = new DaoAuthenticationProvider();
        prov.setUserDetailsService(userDetailsService);
        prov.setPasswordEncoder(passwordEncoder());
        return prov;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public JwtAuthenticationFilter jwtAuthenticationFilter() {
        return new JwtAuthenticationFilter(jwtUtil, userDetailsService);
    }

    /**
     * CORS configuration used by Spring Security.
     */
 
    @Bean
    @Profile("dev")
    public CorsConfigurationSource devCorsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        config.setAllowedOriginPatterns(List.of("*")); // allow all in dev
        config.setAllowedMethods(List.of("GET","POST","PUT","PATCH","DELETE","OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        config.setExposedHeaders(List.of("Authorization", "Content-Disposition"));
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(Customizer.withDefaults()) // will pick up corsConfigurationSource() bean
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authenticationProvider(daoAuthenticationProvider()) // ensure DAO provider is used
            .authorizeHttpRequests(authz -> authz
            	    .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

            	    .requestMatchers("/uploads/**").permitAll()
            	    .requestMatchers("/error").permitAll()

            	    .requestMatchers("/api/auth/**").permitAll()
            	    .requestMatchers("/api/stats/**").permitAll()
            	    .requestMatchers("/api/institutions/**").permitAll()

            	    // quizzes + questions REQUIRE login
            	 // ✅ Public: decide login flow for /play/{code}
            	    .requestMatchers(HttpMethod.GET, "/api/quizzes/code/*/creator-type").permitAll()

            	    // 🔐 All other quiz APIs require login
            	    .requestMatchers("/api/quizzes/**").authenticated()

            	    .requestMatchers("/api/questions/**").authenticated()
            	    .requestMatchers("/api/results/**").authenticated()

            	    .requestMatchers("/api/proctor/**").authenticated()

            	    .requestMatchers("/h2-console/**").permitAll()
            	    
            	    
            	    
            	 // ===============================
            	 // 🟣 POOL (LIVE QUIZ) – ISOLATED
            	 // ===============================

            	 // WebSocket handshake (SockJS)
            	 .requestMatchers("/ws/**").permitAll()

            	 // Players (NO LOGIN)
            	 .requestMatchers(HttpMethod.POST, "/api/pool/join").permitAll()
            	 .requestMatchers(HttpMethod.GET, "/api/pool/players/**").permitAll()

            	 // 🔐 POOL HOST ONLY
            	 .requestMatchers("/api/pool/start/**").hasRole("POOL_USER")
            	 .requestMatchers("/api/pool/**").hasRole("POOL_USER")




            	    .anyRequest().authenticated()
            	);


        http.headers(headers -> headers.frameOptions(frame -> frame.sameOrigin()));
        http.addFilterBefore(jwtAuthenticationFilter(), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
    
    
//    @Bean
//    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
//
//        http
//            .cors(Customizer.withDefaults())
//            .csrf(csrf -> csrf.disable())
//            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
//            .authenticationProvider(daoAuthenticationProvider())
//
//            .authorizeHttpRequests(auth -> auth
//                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
//
//                // allow everything
//                .requestMatchers("/**").permitAll()
//
//                .anyRequest().permitAll()
//            );
//
//        http.headers(headers -> headers.frameOptions(frame -> frame.sameOrigin()));
//        http.addFilterBefore(jwtAuthenticationFilter(), UsernamePasswordAuthenticationFilter.class);
//
//        return http.build();
//    }
    
}

