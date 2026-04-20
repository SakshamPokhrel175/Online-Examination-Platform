package com.mp.config_pool;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class PoolWebSocketConfig implements WebSocketMessageBrokerConfigurer {

	    @Override
	    public void configureMessageBroker(MessageBrokerRegistry registry) {
	        // Clients subscribe here
	        registry.enableSimpleBroker("/topic");

	        // Clients send messages here
	        registry.setApplicationDestinationPrefixes("/app");
	    }

	    @Override
	    public void registerStompEndpoints(StompEndpointRegistry registry) {
	        registry
	            .addEndpoint("/ws")
	            .setAllowedOriginPatterns("*")
	            .withSockJS();
	        // ✅ NEW (for proctoring)
	        registry
	            .addEndpoint("/ws-proctor")
	            .setAllowedOriginPatterns("*")
	            .withSockJS();
	    }
	}

