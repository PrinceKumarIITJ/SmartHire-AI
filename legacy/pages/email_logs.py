import streamlit as st
import pandas as pd

st.title("Communication Logs")
st.markdown("Track automated emails sent to candidates. (Requires SMTP Configuration)")

logs = st.session_state.workflow_state.get("email_logs", [])

if not logs:
    st.info("No communications have been recorded yet.")
else:
    df = pd.DataFrame(logs)
    
    # Custom colored styling for Dataframe
    def style_status(val):
        if "Sent" in val:
            return 'color: #A7F3D0; font-weight: bold;'
        elif "Failed" in val:
            return 'color: #FECACA; font-weight: bold;'
        return 'color: #CBD5E1'

    st.dataframe(df.style.map(style_status, subset=['status']), use_container_width=True)

    st.divider()
    st.subheader("Automation Controls")
    
    col1, col2 = st.columns(2)
    with col1:
        if st.button("Retry Failed Communications", disabled=not any("Failed" in l.get('status', '') for l in logs)):
            st.warning("Manual retry initiated. Ensure SMTP credentials are valid.")
            
    with col2:
        st.caption("Auto-email configuration is managed via system environment variables.")
