import streamlit as st
import os
from agents.workflow import create_workflow
from services.parser import extract_text

# Custom Hero Banner
st.markdown("""
<div style="background: linear-gradient(90deg, rgba(129, 140, 248, 0.1) 0%, rgba(192, 132, 252, 0.1) 100%); padding: 24px; border-radius: 16px; border: 1px solid rgba(129, 140, 248, 0.15); margin-bottom: 24px;">
    <h2 style="margin: 0; color: #ffffff; font-family: 'Space Grotesk', sans-serif;">Design Job Description</h2>
    <p style="color: #94A3B8; margin: 8px 0 0 0; font-size: 1.05em;">Automate your resume screening by providing a detailed job description. SmartHire AI will extract key requirements.</p>
</div>
""", unsafe_allow_html=True)

cola, colb = st.columns([2, 1])

with cola:
    upload_method = st.radio("Provide JD via:", ["Paste Text", "Upload PDF/TXT Document"], label_visibility="collapsed")
    
    jd_raw_text = ""
    if upload_method == "Paste Text":
        jd_raw_text = st.text_area("Paste the Job Description here", height=280, 
                                 placeholder="""Job Title: Senior Python Developer
We are looking for...
Requirements: 
- 5+ years of experience
- Strong Python, LangChain, AWS skills...""")
    else:
        uploaded_jd = st.file_uploader("Upload Job Description", type=['pdf', 'txt'])
        if uploaded_jd:
            if uploaded_jd.name.endswith('.pdf'):
                # Save temp to extract
                os.makedirs("data/resumes", exist_ok=True)
                temp_path = os.path.join("data/resumes", "temp_jd.pdf")
                with open(temp_path, "wb") as f:
                    f.write(uploaded_jd.getbuffer())
                jd_raw_text = extract_text(temp_path)
            else:
                jd_raw_text = uploaded_jd.getvalue().decode("utf-8")

with colb:
    st.markdown("""
    <div class="metric-card" style="margin-top: 15px;">
        <h4 style="margin-top: 0; color: #818CF8; font-family: 'Space Grotesk', sans-serif;">Optimizing Extraction</h4>
        <ul style="color: #CBD5E1; font-size: 0.9em; padding-left: 15px; margin-bottom: 0; line-height: 1.6;">
            <li>Specify minimum years of experience clearly (e.g. "5+ years").</li>
            <li>List specific must-have technical skills.</li>
            <li>Include preferred degree requirements.</li>
        </ul>
    </div>
    """, unsafe_allow_html=True)
    
    st.markdown("<div style='height: 15px;'></div>", unsafe_allow_html=True)
    if st.button("Extract JD Requirements", type="primary", use_container_width=True):
        if len(jd_raw_text) < 20:
            st.error("Please provide a longer job description.")
        else:
            with st.spinner("Analyzing Job Description..."):
                # Save to state
                st.session_state.workflow_state["jd_text"] = jd_raw_text
                
                from agents.jd_agent import parse_jd_node
                result = parse_jd_node(st.session_state.workflow_state)
                
                if "error" in result:
                    st.error(result["error"])
                else:
                    st.session_state.workflow_state["job_description"] = result["job_description"]
                    st.success("Successfully analyzed job description.")

st.divider()

# Display Parsed Results
if st.session_state.workflow_state.get("job_description"):
    jd = st.session_state.workflow_state["job_description"]
    
    st.markdown(f"""
    <div style="background: rgba(30, 41, 59, 0.3); border-radius: 12px; padding: 20px; border: 1px solid rgba(255, 255, 255, 0.05); margin-bottom: 20px;">
        <h3 style="margin-top:0; color: #C084FC;">Extracted Role Profile: {jd.title}</h3>
    </div>
    """, unsafe_allow_html=True)
    
    c1, c2, c3 = st.columns(3)
    c1.metric("Min. Experience", f"{jd.experience_years} Years")
    c2.metric("Min. Education", jd.education if jd.education else "Not specified")
    c3.metric("Keywords Identified", len(jd.role_keywords))

    st.markdown("<div style='height: 15px;'></div>", unsafe_allow_html=True)
    
    # Must-Have Skills layout
    st.markdown("#### Must-Have Skills")
    html_must = "".join([f"<span class='skill-chip matched'>{s}</span>" for s in jd.must_have_skills])
    st.markdown(html_must, unsafe_allow_html=True)
    
    if jd.preferred_skills:
        st.markdown("<div style='height: 10px;'></div>", unsafe_allow_html=True)
        st.markdown("#### Preferred Skills")
        html_pref = "".join([f"<span class='skill-chip'>{s}</span>" for s in jd.preferred_skills])
        st.markdown(html_pref, unsafe_allow_html=True)
        
    st.markdown("<div style='height: 20px;'></div>", unsafe_allow_html=True)
    with st.expander("View Raw JD Context"):
        st.write(jd.raw_text)

