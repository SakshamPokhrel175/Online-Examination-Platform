package com.mp.controller;

import com.mp.entity.Institution;
import com.mp.repository.UserRepository;
import com.mp.service.InstitutionService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/stats")
public class StatsController {

    private final InstitutionService institutionService;
    private final UserRepository userRepository;

    public StatsController(InstitutionService institutionService, UserRepository userRepository) {
        this.institutionService = institutionService;
        this.userRepository = userRepository;
    }

    // =========================
    // Institution Insights
    // =========================
    @GetMapping("/institutions")
    public List<InstitutionStatDTO> getInstitutionStats() {
        return institutionService.getAll().stream().map(inst ->
            new InstitutionStatDTO(
                inst.getId(),
                inst.getInstituteName(),
                userRepository.countStudentsByInstitution(inst.getId()),
                userRepository.countFacultyByInstitution(inst.getId())
            )
        ).collect(Collectors.toList());
    }

    // =========================
    // General Users Card
    // =========================
    @GetMapping("/general-users/count")
    public long getGeneralUsersCount() {
        return userRepository.countByUserType("GENERAL");
    }

    // =========================
    // DTO
    // =========================
    public record InstitutionStatDTO(
        Long institutionId,
        String name,
        long studentCount,
        long facultyCount
    ) {}
}
