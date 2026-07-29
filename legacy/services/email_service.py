import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import Dict, Optional

from utils.constants import SMTP_HOST, SMTP_PORT, SMTP_EMAIL, SMTP_PASSWORD, HR_COMPANY_NAME
from utils.models import CandidateProfile
from utils.prompts import EMAIL_INVITE_TEMPLATE, EMAIL_REJECT_TEMPLATE


def check_email_config() -> bool:
    """Verifies if SMTP is configured."""
    if not SMTP_EMAIL or not SMTP_PASSWORD:
        return False
    return True


def send_email(to_email: str, subject: str, body: str) -> bool:
    """
    Sends an email using the configured SMTP server. 
    Returns True if successful, False otherwise.
    """
    if not check_email_config():
        print(f"Skipping email to {to_email} - SMTP config missing.")
        return False

    msg = MIMEMultipart()
    msg['From'] = SMTP_EMAIL
    msg['To'] = to_email
    msg['Subject'] = subject

    msg.attach(MIMEText(body, 'plain'))

    try:
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        server.starttls()
        server.login(SMTP_EMAIL, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f"Error sending email to {to_email}: {e}")
        return False


def send_invite_email(candidate: CandidateProfile, role: str) -> Dict[str, str]:
    """Sends interview invite email to Shortlisted candidate."""
    top_skills = ", ".join(candidate.skills[:3]) if candidate.skills else "your listed skills"
    
    body = EMAIL_INVITE_TEMPLATE.format(
        candidate_name=candidate.name,
        role=role,
        company=HR_COMPANY_NAME,
        top_skills=top_skills
    )
    subject = f"Interview Invitation: {role} at {HR_COMPANY_NAME}"
    
    success = send_email(candidate.email, subject, body)
    
    return {
        "candidate_name": candidate.name,
        "email": candidate.email,
        "template_type": "Invite",
        "status": "Sent" if success else "Failed (No Config/Error)",
        "sent_at": datetime.now().isoformat()
    }


def send_rejection_email(candidate: CandidateProfile, role: str) -> Dict[str, str]:
    """Sends rejection email."""
    body = EMAIL_REJECT_TEMPLATE.format(
        candidate_name=candidate.name,
        role=role,
        company=HR_COMPANY_NAME
    )
    subject = f"Update on your application for {role} at {HR_COMPANY_NAME}"
    
    success = send_email(candidate.email, subject, body)
    
    return {
        "candidate_name": candidate.name,
        "email": candidate.email,
        "template_type": "Rejection",
        "status": "Sent" if success else "Failed (No Config/Error)",
        "sent_at": datetime.now().isoformat()
    }
