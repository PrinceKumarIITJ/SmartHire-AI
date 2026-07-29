import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate
from backend.app.services.llm_factory import get_llm
import logging

logger = logging.getLogger("smarthire.agents.email_agent")

class EmailDraftContent(BaseModel):
    subject: str = Field(description="Professional email subject line")
    body: str = Field(description="Constructive, skills-grounded email body text")

EMAIL_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are an empathetic, professional AI recruiter assistant. 
Generate a personalized candidate notification email ({email_type}: selection or rejection).
Rules:
1. Rejection emails MUST be constructive and grounded strictly in explicit missing skills ({missing_skills}) or target qualifications. Never use generic 'not selected' templates. Frame missing skills as clear areas for professional growth.
2. Selection emails MUST highlight specific matched candidate strengths ({matched_skills}).
3. ABSOLUTELY NEVER reference demographic signals, age, gender, pronouns, or university prestige markers. Focus strictly on job skills.
4. Keep the tone warm, professional, and encouraging."""),
    ("user", "Candidate Name: {candidate_name}\nJob Title: {job_title}\nMatch Score: {final_score}\nMatched Skills: {matched_skills}\nMissing Skills: {missing_skills}\nReasoning: {reasoning}")
])

async def run_email_agent(
    candidate_name: str,
    job_title: str,
    match_data: Dict[str, Any]
) -> Dict[str, str]:
    """
    Email Agent: Drafts a skills-grounded selection or rejection candidate notification.
    """
    final_score = match_data.get("final_score", 0.0)
    email_type = "selection" if final_score >= 0.70 else "rejection"
    
    logger.info(f"Executing Email Agent to generate '{email_type}' draft for {candidate_name}...")

    llm = get_llm()
    structured_llm = llm.with_structured_output(EmailDraftContent)
    chain = EMAIL_PROMPT | structured_llm

    input_vars = {
        "email_type": email_type,
        "candidate_name": candidate_name,
        "job_title": job_title,
        "final_score": str(final_score),
        "matched_skills": ", ".join(match_data.get("matched_skills", [])) or "general competencies",
        "missing_skills": ", ".join(match_data.get("missing_skills", [])) or "none",
        "reasoning": match_data.get("reasoning", "")
    }

    try:
        res = await chain.ainvoke(input_vars)
        return {"type": email_type, "subject": res.subject, "body": res.body}
    except Exception as e:
        logger.warning(f"Async LLM call failed in Email Agent: {e}. Trying sync invoke...")
        res = chain.invoke(input_vars)
        return {"type": email_type, "subject": res.subject, "body": res.body}

def send_smtp_email(to_email: str, subject: str, body: str) -> bool:
    """Send approved email via SMTP settings in environment variables."""
    smtp_email = os.getenv("SMTP_EMAIL")
    smtp_pass = os.getenv("SMTP_PASSWORD")
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))

    if not smtp_email or not smtp_pass:
        logger.warning("SMTP_EMAIL or SMTP_PASSWORD missing. Simulating successful email send.")
        return True

    try:
        msg = MIMEMultipart()
        msg["From"] = smtp_email
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))

        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls()
        server.login(smtp_email, smtp_pass)
        server.send_message(msg)
        server.quit()
        logger.info(f"Email successfully dispatched to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email} via SMTP: {e}")
        return False
