# services/ai_interviewer/scoring.py

def calculate_answer_score(text_analysis, facial_analysis, tone_analysis):
    """
    Calculates a score for a single answer based on various analysis results.
    This is a simplified example; a real-world model would be more complex.
    """
    score = 0
    weights = {
        "text": 0.5,
        "facial": 0.3,
        "tone": 0.2
    }

    # Text analysis contribution
    if text_analysis and text_analysis.get("sentiment") == "positive":
        score += weights["text"] * 0.7 # Positive sentiment gets higher contribution
    elif text_analysis and text_analysis.get("sentiment") == "neutral":
        score += weights["text"] * 0.4
    # You'd add logic for keyword matching, relevance to question, etc.

    # Facial analysis contribution
    if facial_analysis and facial_analysis.get("overall_engagement", 0) > 0.5:
        score += weights["facial"] * facial_analysis["overall_engagement"]
    # You could add specific emotion detection logic

    # Tone analysis contribution
    if tone_analysis and tone_analysis.get("confidence_score", 0) > 0.6:
        score += weights["tone"] * tone_analysis["confidence_score"]

    return round(score * 100, 2) # Scale to 0-100

def calculate_overall_interview_score(interview_answers_data):
    """
    Calculates the overall interview score based on all individual answer scores.
    """
    if not interview_answers_data:
        return 0

    total_score = sum(answer.get('score', 0) for answer in interview_answers_data)
    average_score = total_score / len(interview_answers_data)
    return round(average_score, 2)