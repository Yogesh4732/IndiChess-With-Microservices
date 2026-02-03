package com.indichess.authservice.security;

import com.indichess.authservice.model.User;
import com.indichess.authservice.repo.UserRepository;
import com.indichess.authservice.security.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Component
@RequiredArgsConstructor
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();

        String email = oAuth2User.getAttribute("email");
        String name = oAuth2User.getAttribute("name");
        if (email == null || email.isBlank()) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Email not provided by Google");
            return;
        }
        // Prepare an effectively final display name for lambda usage
        String displayName = (name == null || name.isBlank()) ? email : name;

        // Find or create user
        User user = userRepository.findByEmail(email).orElseGet(() -> {
            // Use a local encoder instance to avoid depending on the PasswordEncoder bean
            String encoded = new BCryptPasswordEncoder().encode("oauth2-google");
            User newUser = User.builder()
                .email(email)
                .name(displayName)
                .password(encoded)
                .build();
            return userRepository.save(newUser);
        });

        // Generate JWT for this user
        String token = jwtUtil.generateToken(user.getEmail());

        // Redirect back to SPA with token in URL fragment
        String redirectUrl = "http://localhost:3000/oauth2/callback#token=" +
                URLEncoder.encode(token, StandardCharsets.UTF_8);
        response.sendRedirect(redirectUrl);
    }
}
