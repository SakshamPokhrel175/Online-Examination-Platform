package com.mp.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Paths;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOriginPatterns("*") 
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Get the absolute path to the project root folder
        String uploadPath = Paths.get(System.getProperty("user.dir"), "uploads").toUri().toString();
        
        System.out.println("=====================================");
        System.out.println("SERVING IMAGES FROM: " + uploadPath);
        System.out.println("=====================================");

        // Maps /uploads/** to the absolute path on your Linux machine
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(uploadPath);
    }
}