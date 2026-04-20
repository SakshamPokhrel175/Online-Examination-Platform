package com.mp.repository;

import com.mp.entity.Quiz;
import com.mp.entity.User;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface QuizRepository extends JpaRepository<Quiz, Long> {

    Optional<Quiz> findByCode(String code);

    List<Quiz> findByCreatedByEmail(String email);

    @Query("SELECT q FROM Quiz q JOIN FETCH q.createdBy WHERE q.id = :id")
    Optional<Quiz> findByIdWithCreator(@Param("id") Long id);
    List<Quiz> findByCreatedByAndCreatorType(User user, String creatorType);

}
