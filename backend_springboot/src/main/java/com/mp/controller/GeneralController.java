package com.mp.controller;
import java.util.*;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.mp.entity.General;
import com.mp.repository.GeneralRepository;

@RestController
public class GeneralController {
	
	@Autowired
	private GeneralRepository generalRepository;
	
	@GetMapping("/general")
	public List<General> getAllGeneral(){
		return generalRepository.findAll();
		
	}
	
	@GetMapping("/search")
	public List<General> getGeneralByName(@RequestParam String name){
		return generalRepository.findByName(name);
	}

}
