package com.mp.security;

import com.mp.entity.User;
import com.mp.entity.Role;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Standard Spring Security UserDetails wrapper for your User entity.
 * Ensures authorities come from roles and are returned as SimpleGrantedAuthority.
 */
public class CustomUserDetails implements UserDetails {

    private final User user;
    private final Collection<? extends GrantedAuthority> authorities;

    public CustomUserDetails(User user) {
        this.user = user;
        Set<Role> roles = user.getRoles();
        this.authorities = (roles == null) ? Set.of() :
            roles.stream()
                 .map(r -> new SimpleGrantedAuthority("ROLE_" + r.name()))
                 .collect(Collectors.toSet());

    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return user.getPassword(); // should be BCrypt hashed in DB
    }

    @Override
    public String getUsername() {
        return user.getEmail();
    }

    @Override
    public boolean isAccountNonExpired() {
        return true; // adapt if you add fields
    }

    @Override
    public boolean isAccountNonLocked() {
        return true; // adapt if you add fields
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true; // adapt if you add fields
    }

    @Override
    public boolean isEnabled() {
        return user.isActive();
    }
}
