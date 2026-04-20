package com.mp.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.Set;

@Entity
@Table(name = "users")
@Data // Includes @Getter, @Setter, @ToString, @EqualsAndHashCode
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false)
    @JsonIgnore // Prevents password from being sent in API responses
    private String password;

    @ElementCollection(targetClass = Role.class, fetch = FetchType.EAGER)
    @CollectionTable(
        name = "user_roles", 
        joinColumns = @JoinColumn(name = "user_id", nullable = false, foreignKey = @ForeignKey(name = "FK_USER_ROLE_REF")) // ✅ Added FK Name
    )
    @Column(name = "role")
    @Enumerated(EnumType.STRING)
    private Set<Role> roles;

    @Column(length = 30)
    private String userType;

    // FIX: Renamed Constraint to V5 (to solve MySQL conflict) and added JsonIgnoreProperties to prevent circular serialization
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "institution_id", foreignKey = @ForeignKey(name = "FK_USER_INSTITUTION_V5")) 
    @JsonIgnoreProperties({"users", "hibernateLazyInitializer", "handler"}) 
    private Institution institution;

    private boolean active = true;
    private boolean emailVerified = false;
    private String phone;
    
    @Column(name = "profile_image_url")
    private String profileImageUrl;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}