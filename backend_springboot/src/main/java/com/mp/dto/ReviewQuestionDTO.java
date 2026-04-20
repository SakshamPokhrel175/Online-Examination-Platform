package com.mp.dto;

import java.util.List;

public class ReviewQuestionDTO {
    public Long id;
    public String content;
    public String type;           // ✅ REQUIRED

    public List<String> options;

    // ✅ ONLY for review screen
    public String correctAnswer;
}
