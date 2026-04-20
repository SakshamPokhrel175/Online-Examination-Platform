package com.mp.entity;

import java.util.HashSet;
import java.util.Set;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "institutions")
@AllArgsConstructor
@NoArgsConstructor
public class Institution {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "institute_name", nullable = false)
    private String instituteName;

    @Column(name = "institute_location", nullable = false)
    private String instituteLocation;

    @Column(name = "institute_image")
    private String instituteImage;   // stored as URL or file path
    
    // ✅ NEW
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(
        name = "institution_domains",
        joinColumns = @JoinColumn(name = "institution_id")
    )
    @Column(name = "domain")
    private Set<String> allowedDomains = new HashSet<>();

	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public String getInstituteName() {
		return instituteName;
	}

	public void setInstituteName(String instituteName) {
		this.instituteName = instituteName;
	}

	public String getInstituteLocation() {
		return instituteLocation;
	}

	public void setInstituteLocation(String instituteLocation) {
		this.instituteLocation = instituteLocation;
	}

	public String getInstituteImage() {
		return instituteImage;
	}

	public void setInstituteImage(String instituteImage) {
		this.instituteImage = instituteImage;
	}

	public Set<String> getAllowedDomains() {
		return allowedDomains;
	}

	public void setAllowedDomains(Set<String> allowedDomains) {
		this.allowedDomains = allowedDomains;
	}
    
    

}
