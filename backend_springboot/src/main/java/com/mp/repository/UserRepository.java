package com.mp.repository;

import com.mp.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);

    // =========================
    // Institution-based counts
    // =========================

    @Query("""
    	    SELECT COUNT(u) FROM User u
    	    JOIN u.roles r
    	    WHERE u.institution.id = :institutionId
    	    AND r = com.mp.entity.Role.STUDENT
    	""")
    	long countStudentsByInstitution(@Param("institutionId") Long institutionId);

    	@Query("""
    	    SELECT COUNT(u) FROM User u
    	    JOIN u.roles r
    	    WHERE u.institution.id = :institutionId
    	    AND r = com.mp.entity.Role.TEACHER
    	""")
    	long countFacultyByInstitution(@Param("institutionId") Long institutionId);


    // =========================
    // Platform-wide counts
    // =========================

    long countByUserType(String userType);
}
