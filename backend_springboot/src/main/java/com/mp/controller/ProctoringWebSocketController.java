package com.mp.controller;

import com.mp.dto.ProctoringAlertDTO;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
public class ProctoringWebSocketController {

    private final SimpMessagingTemplate messagingTemplate;

    public ProctoringWebSocketController(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    // 🔥 SEND REAL-TIME ALERT
    public void sendAlert(String quizCode, ProctoringAlertDTO alert) {

        // ✅ Send to specific quiz (student side)
        messagingTemplate.convertAndSend(
                "/topic/proctor/" + quizCode,
                alert
        );

        // 🔥 ADD THIS (TEACHER SIDE)
        messagingTemplate.convertAndSend(
                "/topic/proctor/global",
                alert
        );
    }
}