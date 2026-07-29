JD_PARSE_PROMPT = """
You are an expert HR Technical Recruiter. Extract structured information from the following Job Description.
Return the output strictly as a JSON object with the following keys, and nothing else. Do not use markdown backticks.

Expected JSON Structure:
{{
  "title": "Job Title or Role Name",
  "must_have_skills": ["skill1", "skill2"],
  "preferred_skills": ["skill3"],
  "experience_years": 0 (integer, minimum years required),
  "education": "Required Degree",
  "role_keywords": ["keyword1", "keyword2"]
}}

Job Description Text:
{text}
"""

RESUME_PARSE_PROMPT = """
You are an expert ATS (Applicant Tracking System) parser. Extract structured information from the following candidate resume text.
Return the output strictly as a JSON object with the following keys, and nothing else. Do not use markdown backticks.
Compute the 'total_experience_years' by estimating the total years worked across all roles.

Expected JSON Structure:
{{
  "name": "Candidate Full Name",
  "email": "email_address",
  "phone": "phone_number",
  "skills": ["Python", "AWS", "Machine Learning"],
  "projects": [
      {{
         "name": "Project Name",
         "description": "Brief what they did",
         "technologies": ["tech1", "tech2"]
      }}
  ],
  "work_experience": [
      {{
         "company": "Company Name",
         "role": "Job Title",
         "duration": "e.g., Jan 2020 - Present",
         "years": 3.5, 
         "description": "Key responsibilities"
      }}
  ],
  "total_experience_years": 3.5,
  "education": [
      {{
         "degree": "Degree Level",
         "institution": "University Name",
         "year": "Graduation Year"
      }}
  ],
  "certifications": ["Cert 1", "Cert 2"]
}}

Resume Text:
{text}
"""

EXPLAIN_MATCH_PROMPT = """
You are an AI Hiring Assistant explaining a candidate's suitability to a recruiter.
Given the job description summary and candidate profile, write a short, 2-3 sentence paragraph explaining the semantic and project-level match between the candidate and the role.
Be concise, professional, and highlight specific alignment points.

Job Description Title: {jd_title}
Job Keywords: {jd_keywords}
Required Experience: {jd_experience}

Candidate Name: {name}
Candidate Total Experience: {candidate_experience}
Candidate Projects/Roles: {candidate_projects_roles}

Explain why they fit (or don't fit) the project expectations and domain context:
"""

EMAIL_INVITE_TEMPLATE = """
Subject: Interview Invitation: {role} at {company}

Dear {candidate_name},

Thank you for applying for the {role} position at {company}. 

We were very impressed by your background, particularly your skills in {top_skills}. We are excited about the possibility of you joining our team and would like to invite you to an initial interview.

We will share the Google Calendar invite shortly. Please let us know your availability for next week.

Best regards,
Talent Acquisition Team
{company}
"""

EMAIL_REJECT_TEMPLATE = """
Subject: Update on your application for {role} at {company}

Dear {candidate_name},

Thank you for taking the time to apply for the {role} role and for sharing your resume with us. 

While we appreciate your background and skills, we have decided to move forward with other candidates whose experience more closely matches the specific requirements of our current projects and timeline.

We will keep your resume in our system and reach out if a more suitable opportunity opens up in the future.

We wish you the best in your job search and professional journey.

Best regards,
Talent Acquisition Team
{company}
"""
