import streamlit as st
import os

# Custom Hero Banner
st.markdown("""
<div style="background: linear-gradient(90deg, rgba(129, 140, 248, 0.1) 0%, rgba(192, 132, 252, 0.1) 100%); padding: 24px; border-radius: 16px; border: 1px solid rgba(129, 140, 248, 0.15); margin-bottom: 24px;">
    <h2 style="margin: 0; color: #ffffff; font-family: 'Space Grotesk', sans-serif;">Import Applicant Resumes</h2>
    <p style="color: #94A3B8; margin: 8px 0 0 0; font-size: 1.05em;">Upload multiple PDF resumes. The system will parse them and run them through our AI Matching Engine against the Job Description.</p>
</div>
""", unsafe_allow_html=True)

if not st.session_state.workflow_state.get("job_description"):
    st.warning("Please set up a Job Description first on the Design page.")
    st.stop()

uploaded_files = st.file_uploader("Upload PDF Resumes", type="pdf", accept_multiple_files=True)

if uploaded_files:
    os.makedirs("data/resumes", exist_ok=True)
    
    st.markdown("<div style='height: 10px;'></div>", unsafe_allow_html=True)
    if st.button("Process Resumes and Run Analysis", type="primary", use_container_width=True):
        saved_paths = []
        with st.spinner("Saving uploaded files..."):
            for file in uploaded_files:
                path = os.path.join("data/resumes", file.name)
                with open(path, "wb") as f:
                    f.write(file.getbuffer())
                saved_paths.append(path)
                
        # Update workflow state
        st.session_state.workflow_state["resume_files"] = saved_paths
        
        # We trigger the workflow natively using LangGraph
        from agents.workflow import create_workflow
        app = create_workflow()
        
        try:
            with st.spinner("Processing analysis workflow..."):
                # Run standard workflow
                state_result = app.invoke(st.session_state.workflow_state)
                
                if "error" in state_result and state_result["error"]:
                    st.error(f"Workflow failed: {state_result['error']}")
                else:
                    # Update global state with final output
                    st.session_state.workflow_state = state_result
                    st.success(f"Successfully processed {len(saved_paths)} resumes.")
                    st.toast("Analysis complete. Check the Ranking Dashboard.")
                    
        except Exception as e:
            st.error(f"Critical error during workflow execution: {e}")

# Display previously parsed candidates
if st.session_state.workflow_state.get("candidates"):
    st.divider()
    st.markdown(f"### Extracted Candidates ({len(st.session_state.workflow_state['candidates'])})")
    
    for cand in st.session_state.workflow_state["candidates"]:
        with st.expander(f"👤 {cand.name} — {cand.email}"):
            c1, c2 = st.columns(2)
            c1.markdown(f"""
            <div class="metric-card" style="padding:15px; margin-bottom:10px;">
                <p style="margin:0; font-size:0.85em; color:#94A3B8;">TOTAL EXPERIENCE</p>
                <h4 style="margin:5px 0 0 0; color:#818CF8;">{cand.total_experience_years} Years</h4>
            </div>
            """, unsafe_allow_html=True)
            
            c2.markdown(f"""
            <div class="metric-card" style="padding:15px; margin-bottom:10px;">
                <p style="margin:0; font-size:0.85em; color:#94A3B8;">CONTACT NUMBER</p>
                <h4 style="margin:5px 0 0 0; color:#C084FC;">{cand.phone if cand.phone else 'N/A'}</h4>
            </div>
            """, unsafe_allow_html=True)
            
            st.markdown("<div style='height: 10px;'></div>", unsafe_allow_html=True)
            st.write("**Top Skills Extracted:**")
            html_skills = "".join([f"<span class='skill-chip'>{s}</span>" for s in cand.skills[:10]])
            st.markdown(html_skills, unsafe_allow_html=True)
            st.markdown("<div style='height: 10px;'></div>", unsafe_allow_html=True)

