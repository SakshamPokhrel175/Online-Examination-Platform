package com.mp.service;

import com.mp.entity.Institution;
import com.mp.repository.InstitutionRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@Service
public class InstitutionService {

	private final InstitutionRepository repo;

	public InstitutionService(InstitutionRepository repo) {
	    this.repo = repo;
	}

	public Institution save(Institution inst) {
	    return repo.save(inst);
	}


    public List<Institution> getAll() {
        return repo.findAll();
    }

    public Institution getById(Long id) {
        return repo.findById(id).orElse(null);
    }

    public Institution create(String name, String location, String imagePath) {
        Institution inst = new Institution();
        inst.setInstituteName(name);
        inst.setInstituteLocation(location);
        inst.setInstituteImage(imagePath);
        return repo.save(inst);
    }

    public Institution update(Long id, String name, String location, String img) {
        Institution inst = repo.findById(id).orElse(null);
        if (inst == null) return null;

        inst.setInstituteName(name);
        inst.setInstituteLocation(location);
        if (img != null) {
            inst.setInstituteImage(img);
        }
        return repo.save(inst);
    }

    public void delete(Long id) {
        repo.deleteById(id);
    }
}
