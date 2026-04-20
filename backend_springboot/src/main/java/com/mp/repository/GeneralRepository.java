package com.mp.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.mp.entity.General;

@Repository
public interface GeneralRepository extends JpaRepository<General, Integer> {

    List<General> findByName(String name);

}
