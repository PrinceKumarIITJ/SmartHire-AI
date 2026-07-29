import streamlit as st
from services.llm_factory import get_llm
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
import json

# Custom Hero Banner
st.markdown("""
<div style="background: linear-gradient(90deg, rgba(129, 140, 248, 0.1) 0%, rgba(192, 132, 252, 0.1) 100%); padding: 24px; border-radius: 16px; border: 1px solid rgba(129, 140, 248, 0.15); margin-bottom: 24px;">
    <h2 style="margin: 0; color: #ffffff; font-family: 'Space Grotesk', sans-serif;">Conversational Resume Chatbot</h2>
    <p style="color: #94A3B8; margin: 8px 0 0 0; font-size: 1.05em;">Query the candidate pool or compare specific profiles using natural language.</p>
</div>
""", unsafe_allow_html=True)

# Ensure candidates exist
if not st.session_state.workflow_state.get("candidates"):
    st.info("No candidates loaded yet. Please upload resumes and run the analysis first.")
    st.stop()

candidates = st.session_state.workflow_state["candidates"]
jd = st.session_state.workflow_state.get("job_description")

# Reset chat history if candidate list changes
if "chat_candidates_hash" not in st.session_state or st.session_state.chat_candidates_hash != len(candidates):
    st.session_state.chat_candidates_hash = len(candidates)
    st.session_state.chat_history = []

# Format candidate info for LLM context
formatted_candidates = []
for c in candidates:
    cand_info = {
        "name": c.name,
        "email": c.email,
        "phone": c.phone,
        "skills": c.skills,
        "total_experience_years": c.total_experience_years,
        "education": [{"degree": e.degree, "institution": e.institution, "year": e.year} for e in c.education],
        "projects": [{"name": p.name, "description": p.description, "technologies": p.technologies} for p in c.projects],
        "work_experience": [{"company": w.company, "role": w.role, "duration": w.duration, "description": w.description} for w in c.work_experience]
    }
    formatted_candidates.append(cand_info)

candidates_context = json.dumps(formatted_candidates, indent=2)

# System prompt defining AI persona and supplying candidates context
system_content = f"""You are an elite HR Recruitment Intelligence Assistant. 
You have access to the following parsed candidates' data in JSON format:

{candidates_context}

Job Description context:
Role: {jd.title if jd else "Not specified"}
Must-have skills: {', '.join(jd.must_have_skills) if jd and jd.must_have_skills else "Not specified"}
Min Experience: {jd.experience_years if jd else 0} years

Answer any query the recruiter asks.
Guidelines:
1. Provide objective, data-driven comparisons.
2. If asked to compare or rank, present the details in a markdown table.
3. Be professional, highlight candidates' strengths and gaps relative to the job requirements.
4. Cite specific projects, companies, or certificates from the candidate data when answering.
5. If the information is not in the data, state that it's not mentioned.
"""

# Display Chat History
for message in st.session_state.chat_history:
    if isinstance(message, HumanMessage):
        with st.chat_message("user"):
            st.markdown(message.content)
    elif isinstance(message, AIMessage):
        with st.chat_message("assistant"):
            st.markdown(message.content)

# Accept User Input
user_query = st.chat_input("Ask about candidate experience, skills, projects, or comparison...")

if user_query:
    # Append human message
    st.session_state.chat_history.append(HumanMessage(content=user_query))
    with st.chat_message("user"):
        st.markdown(user_query)

    # Build prompt messages
    messages = [SystemMessage(content=system_content)]
    # Keep last 10 messages for conversation context window
    messages.extend(st.session_state.chat_history[-10:])

    with st.chat_message("assistant"):
        with st.spinner("Analyzing profiles..."):
            try:
                llm = get_llm(temperature=0.3)
                response = llm.invoke(messages)
                ai_text = response.content
                st.markdown(ai_text)
                st.session_state.chat_history.append(AIMessage(content=ai_text))
            except Exception as e:
                st.error(f"Chatbot failed to respond: {e}")
