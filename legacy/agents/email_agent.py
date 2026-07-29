from utils.models import WorkflowState
from services.email_service import check_email_config, send_invite_email, send_rejection_email
import time

def email_node(state: WorkflowState) -> dict:
    """
    LangGraph Node: Sends auto-emails based on Status.
    """
    print("Agent: Email Notification starting...")
    match_results = state.get("match_results", [])
    candidates = state.get("candidates", [])
    jd = state.get("job_description")
    existing_logs = state.get("email_logs", [])
    
    if not match_results or not jd:
        print("Skipping email node (missing results/JD)")
        return {}

    if not check_email_config():
        print("SMTP not configured. Skipping live emails. (Dry run mode)")
        # We could add 'dry run' logs but let's just log that config is missing.

    cand_map = {c.id: c for c in candidates}
    new_logs = []

    for mr in match_results:
        # Skip if error missing email
        if not mr.candidate_email or "@" not in mr.candidate_email:
            continue
            
        cand = cand_map[mr.candidate_id]
        role = jd.title
        
        # In a real heavy system we would use queues here
        try:
            if mr.status == "Shortlisted":
                log = send_invite_email(cand, role)
                new_logs.append(log)
            elif mr.status == "Rejected":
                log = send_rejection_email(cand, role)
                new_logs.append(log)
        except Exception as e:
            print(f"Error in email workflow: {e}")
            
        time.sleep(1) # Be nice to SMTP
        
    return {"email_logs": existing_logs + new_logs}
