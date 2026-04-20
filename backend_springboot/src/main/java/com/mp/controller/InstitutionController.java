// /m_p_sharda_B-main/src/main/java/com/mp/controller/InstitutionController.java
package com.mp.controller;

import com.mp.entity.Institution;
import java.util.stream.Collectors;
import com.mp.service.InstitutionService;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

@RestController
@RequestMapping("/api/institutions")
public class InstitutionController {

    private final InstitutionService service;
    
    // Define the upload directory
    private static final String UPLOAD_DIR = "uploads";

    public InstitutionController(InstitutionService service) {
        this.service = service;
    }

    // List all
    @GetMapping
    public List<Institution> getAll() {
        return service.getAll();
    }

    // Get one
    @GetMapping("/{id}")
    public ResponseEntity<Institution> getById(@PathVariable Long id) {
        Institution inst = service.getById(id);
        if (inst == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(inst);
    }

    // Create
    @PostMapping
    public ResponseEntity<?> createInstitution(
            @RequestParam("institute_name") String name,
            @RequestParam("institute_location") String location,
            @RequestParam(value = "institute_image", required = false) MultipartFile file
    ) {
        String imagePath = null;
        if (file != null && !file.isEmpty()) {
            try {
                // ✅ FIX: Actually save the file to disk
                imagePath = saveFile(file);
            } catch (IOException e) {
                return ResponseEntity.internalServerError().body("Could not upload file: " + e.getMessage());
            }
        }
        Institution inst = service.create(name, location, imagePath);
        return ResponseEntity.ok(inst);
    }

    // Update
    @PutMapping("/{id}")
    public ResponseEntity<?> updateInstitution(
            @PathVariable Long id,
            @RequestParam("institute_name") String name,
            @RequestParam("institute_location") String location,
            @RequestParam(value = "institute_image", required = false) MultipartFile file
    ) {
        String imagePath = null;
        if (file != null && !file.isEmpty()) {
            try {
                // ✅ FIX: Actually save the file to disk
                imagePath = saveFile(file);
            } catch (IOException e) {
                return ResponseEntity.internalServerError().body("Could not upload file: " + e.getMessage());
            }
        }

        Institution inst = service.update(id, name, location, imagePath);
        if (inst == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(inst);
    }

    // Delete
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteInstitution(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.ok(Collections.singletonMap("message", "Deleted"));
    }

    // ---------------------------------------------------
    // HELPER METHOD TO SAVE FILE
    // ---------------------------------------------------
    private String saveFile(MultipartFile file) throws IOException {
        // Clean the filename
        String fileName = StringUtils.cleanPath(Objects.requireNonNull(file.getOriginalFilename()));
        
        // Create the "uploads" folder if it doesn't exist
        Path uploadPath = Paths.get(UPLOAD_DIR);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        // Save file to: uploads/filename.png
        // "StandardCopyOption.REPLACE_EXISTING" overwrites if file exists
        Path filePath = uploadPath.resolve(fileName);
        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

        // Return the relative path for the database (e.g., "uploads/logo.png")
        return UPLOAD_DIR + "/" + fileName;
    }
    
    
    @PutMapping("/{id}/domains")
    public ResponseEntity<?> updateDomains(
            @PathVariable Long id,
            @RequestBody List<String> domains) {

        Institution inst = service.getById(id);
        if (inst == null) {
            return ResponseEntity.notFound().build();
        }

        inst.setAllowedDomains(
            domains.stream()
                .map(String::toLowerCase)
                .collect(Collectors.toSet())
        );

        service.save(inst);
        return ResponseEntity.ok(inst);
    }

}