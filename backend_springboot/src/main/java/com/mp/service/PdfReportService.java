package com.mp.service;

import com.itextpdf.text.*;
import com.itextpdf.text.pdf.*;
import com.mp.entity.Question;
import com.mp.entity.QuizResult;
import com.mp.repository.QuestionRepository;
import org.springframework.stereotype.Service;

import java.io.OutputStream;
import java.util.List;
import java.util.Map;

@Service
public class PdfReportService {

    private final QuestionRepository questionRepository;

    // ✅ Inject repository
    public PdfReportService(QuestionRepository questionRepository) {
        this.questionRepository = questionRepository;
    }

    // =====================================================
    // ANSWER SHEET PDF (Single Student)
    // =====================================================
    public void generateAnswerSheet(
            OutputStream out,
            QuizResult result
    ) throws Exception {

        Document document = new Document(PageSize.A4);
        PdfWriter writer = PdfWriter.getInstance(document, out);

        // 🔐 Lock PDF (print allowed, editing blocked)

        writer.setEncryption(
        	    new byte[0],                 // user password (empty)
        	    new byte[0],                 // owner password (empty)
        	    PdfWriter.ALLOW_PRINTING,    // ✅ view + print only
        	    PdfWriter.STANDARD_ENCRYPTION_128
        	);




        document.open();

        // ================= FONTS =================
        Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18);
        Font headerFont = FontFactory.getFont(FontFactory.HELVETICA, 11);
        Font questionFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12);
        Font normalFont = FontFactory.getFont(FontFactory.HELVETICA, 11);

        Font correctFont = new Font(Font.FontFamily.HELVETICA, 11, Font.BOLD, BaseColor.GREEN);
        Font wrongFont = new Font(Font.FontFamily.HELVETICA, 11, Font.BOLD, BaseColor.RED);
        Font yourAnsFont = new Font(Font.FontFamily.HELVETICA, 11, Font.BOLD, BaseColor.BLUE);

        // ================= WATERMARK =================
        addWatermark(writer, result.getQuiz().getTitle());

        // ================= HEADER =================
        document.add(new Paragraph(result.getQuiz().getTitle(), titleFont));
        document.add(new Paragraph("Student Name: " + result.getUser().getName(), headerFont));
        document.add(new Paragraph("Email: " + result.getUser().getEmail(), headerFont));
        document.add(new Paragraph(
                "Score: " + result.getScore() + " / " + result.getTotalQuestions(),
                headerFont
        ));
        document.add(new Paragraph(
                "Attempted On: " + result.getAttemptDate(),
                headerFont
        ));
        document.add(Chunk.NEWLINE);

        // ================= QUESTIONS =================
        List<Question> questions =
                questionRepository.findByQuizId(result.getQuiz().getId());

        Map<Long, String> userAnswers = result.getAnswers();

        for (int i = 0; i < questions.size(); i++) {
            Question q = questions.get(i);

            document.add(new Paragraph(
                    "Q" + (i + 1) + ". " + q.getContent(),
                    questionFont
            ));

            String studentAnswer =
                    userAnswers != null ? userAnswers.get(q.getId()) : null;

            String correctAnswer = q.getCorrectAnswer();

            boolean correct =
                    correctAnswer != null &&
                    studentAnswer != null &&
                    correctAnswer.equals(studentAnswer);

            List<String> options = q.getOptions();
            if (options == null) options = List.of();

            for (String opt : options) {

                if (correctAnswer != null && opt.equals(correctAnswer)) {
                    document.add(new Paragraph(
                            "✔ " + opt + " (Correct Answer)",
                            correctFont
                    ));
                }
                else if (studentAnswer != null && opt.equals(studentAnswer)) {
                    document.add(new Paragraph(
                            "✖ " + opt + " (Your Answer)",
                            wrongFont
                    ));
                }
                else {
                    document.add(new Paragraph(opt, normalFont));
                }
            }

            // ❌ If wrong → show correct answer clearly
            if (!correct && correctAnswer != null) {
                document.add(new Paragraph(
                        "Correct Answer: " + correctAnswer,
                        correctFont
                ));
            }

            document.add(new Paragraph(
                    "Marks: " + (correct ? "1 / 1" : "0 / 1"),
                    yourAnsFont
            ));

            document.add(Chunk.NEWLINE);
        }


        document.close();
    }

    // =====================================================
    // EXISTING QUIZ REPORT PDF (Teacher)
    // =====================================================
    public void generate(
            OutputStream out,
            String quizTitle,
            List<QuizResult> results
    ) throws Exception {

        Document document = new Document(PageSize.A4.rotate());
        PdfWriter.getInstance(document, out);
        document.open();

        Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16);
        document.add(new Paragraph("Quiz Report: " + quizTitle, titleFont));
        document.add(Chunk.NEWLINE);

        PdfPTable table = new PdfPTable(7);
        table.setWidthPercentage(100);

        String[] headers = {
                "Name", "Email", "Score", "Total",
                "Percentage", "Status", "Attempted On"
        };

        for (String h : headers) {
            PdfPCell cell = new PdfPCell(new Phrase(h));
            cell.setBackgroundColor(BaseColor.LIGHT_GRAY);
            table.addCell(cell);
        }

        for (QuizResult r : results) {
            int percent = (int) Math.round(
                    (r.getScore() * 100.0) / r.getTotalQuestions()
            );

            table.addCell(r.getUser().getName());
            table.addCell(r.getUser().getEmail());
            table.addCell(String.valueOf(r.getScore()));
            table.addCell(String.valueOf(r.getTotalQuestions()));
            table.addCell(percent + "%");
            table.addCell(r.getStatus());
            table.addCell(r.getAttemptDate().toString());
        }

        document.add(table);
        document.close();
    }
    
    private void addWatermark(PdfWriter writer, String watermarkText) {

        PdfContentByte canvas = writer.getDirectContentUnder();
        Font watermarkFont = new Font(
                Font.FontFamily.HELVETICA,
                52,
                Font.BOLD,
                new BaseColor(200, 200, 200)
        );

        Phrase watermark = new Phrase(watermarkText, watermarkFont);

        for (int i = 0; i < 6; i++) {
            ColumnText.showTextAligned(
                    canvas,
                    Element.ALIGN_CENTER,
                    watermark,
                    300,
                    150 + (i * 100),
                    45
            );
        }
    }

}
