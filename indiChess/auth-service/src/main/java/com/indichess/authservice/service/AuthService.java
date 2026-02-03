package com.indichess.authservice.service;

import com.indichess.authservice.dto.AuthResponse;
import com.indichess.authservice.dto.GoogleLoginRequest;
import com.indichess.authservice.dto.LoginRequest;
import com.indichess.authservice.dto.SignupRequest;
import com.indichess.authservice.model.User;
import com.indichess.authservice.repo.UserRepository;
import com.indichess.authservice.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public void signup(SignupRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalStateException("Email already registered");
        }

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .build();

        userRepository.save(user);
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Invalid credentials"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Invalid credentials");
        }

        String token = jwtUtil.generateToken(user.getEmail());
        return new AuthResponse(token);
    }

    /**
     * Login or sign up a user using a Google ID token.
     * The frontend obtains the ID token from Google and sends it here.
     */
    public AuthResponse loginWithGoogle(GoogleLoginRequest request) {
        String idToken = request.getIdToken();
        if (idToken == null || idToken.isBlank()) {
            throw new IllegalArgumentException("Missing Google ID token");
        }

        try {
            // Minimal verification: call Google's tokeninfo endpoint.
            // In production you may prefer verifying the signature locally
            // using Google's libraries.
            var client = java.net.http.HttpClient.newHttpClient();
            var httpRequest = java.net.http.HttpRequest.newBuilder()
                    .uri(java.net.URI.create("https://oauth2.googleapis.com/tokeninfo?id_token=" + idToken))
                    .GET()
                    .build();

            var response = client.send(httpRequest, java.net.http.HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw new IllegalArgumentException("Invalid Google ID token");
            }

            // Parse minimal fields from the response JSON
            String body = response.body();
            // Very small, dependency‑free extraction of email and name
            String email = extractJsonField(body, "email");
            String name = extractJsonField(body, "name");

            if (email == null || email.isBlank()) {
                throw new IllegalArgumentException("Google token did not contain an email");
            }

            // Find or create the user
            User user = userRepository.findByEmail(email).orElseGet(() -> {
                User newUser = User.builder()
                        .email(email)
                        .name(name != null && !name.isBlank() ? name : email)
                        // Mark as external account: no usable local password
                        .password(passwordEncoder.encode("google-oauth2"))
                        .build();
                return userRepository.save(newUser);
            });

            String token = jwtUtil.generateToken(user.getEmail());
            return new AuthResponse(token);
        } catch (Exception ex) {
            throw new IllegalArgumentException("Failed to verify Google token", ex);
        }
    }

    /**
     * Very small helper to pull a top‑level string field from a JSON object
     * without bringing in a full JSON library here.
     */
    private String extractJsonField(String json, String fieldName) {
        if (json == null || fieldName == null) return null;
        String quoted = "\"" + fieldName + "\"";
        int idx = json.indexOf(quoted);
        if (idx < 0) return null;
        int colon = json.indexOf(':', idx + quoted.length());
        if (colon < 0) return null;
        int startQuote = json.indexOf('"', colon + 1);
        if (startQuote < 0) return null;
        int endQuote = json.indexOf('"', startQuote + 1);
        if (endQuote < 0) return null;
        return json.substring(startQuote + 1, endQuote);
    }
}
