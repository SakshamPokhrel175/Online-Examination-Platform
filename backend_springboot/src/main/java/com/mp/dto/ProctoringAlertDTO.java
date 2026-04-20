package com.mp.dto;

public class ProctoringAlertDTO {

    private String quizCode;
    private String userEmail;
    private String message;
    private boolean critical;
    private long timestamp;

    // ✅ Default constructor
    public ProctoringAlertDTO() {}

    // ✅ Custom constructor
    public ProctoringAlertDTO(String quizCode, String userEmail, String message, boolean critical) {
        this.quizCode = quizCode;
        this.userEmail = userEmail;
        this.message = message;
        this.critical = critical;
        this.timestamp = System.currentTimeMillis();
    }

    // ✅ Getters and Setters

    public String getQuizCode() {
        return quizCode;
    }

    public void setQuizCode(String quizCode) {
        this.quizCode = quizCode;
    }

    public String getUserEmail() {
        return userEmail;
    }

    public void setUserEmail(String userEmail) {
        this.userEmail = userEmail;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public boolean isCritical() {
        return critical;
    }

    public void setCritical(boolean critical) {
        this.critical = critical;
    }

    public long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(long timestamp) {
        this.timestamp = timestamp;
    }
}