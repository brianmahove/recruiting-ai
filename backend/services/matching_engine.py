def calculate_match_score(resume_data, jd_skills):
    if not jd_skills:
        return 0, []

    resume_skills_lower = set(s.lower() for s in resume_data.get("skills", []))
    jd_skills_lower = set(s.lower() for s in jd_skills)

    matched_skills = resume_skills_lower.intersection(jd_skills_lower)
    score = (len(matched_skills) / len(jd_skills_lower)) * 100
    return round(score, 2), list(matched_skills)