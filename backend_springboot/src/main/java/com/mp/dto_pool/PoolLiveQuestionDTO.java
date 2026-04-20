package com.mp.dto_pool;

import java.util.List;

public class PoolLiveQuestionDTO {

    private Long questionId;
    private String content;
    private List<String> options;
    private int questionNumber;
    private int totalQuestions;

    public PoolLiveQuestionDTO(
            Long questionId,
            String content,
            List<String> options,
            int questionNumber,
            int totalQuestions
    ) {
        this.questionId = questionId;
        this.content = content;
        this.options = options;
        this.questionNumber = questionNumber;
        this.totalQuestions = totalQuestions;
    }

    public Long getQuestionId() { return questionId; }
    public String getContent() { return content; }
    public List<String> getOptions() { return options; }
    public int getQuestionNumber() { return questionNumber; }
    public int getTotalQuestions() { return totalQuestions; }
}
