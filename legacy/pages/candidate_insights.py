import streamlit as st
import plotly.express as px
import pandas as pd

st.title("Candidate Insights")
st.markdown("Detailed analysis of candidate evaluation and score derivation.")

if not st.session_state.workflow_state.get("match_results"):
    st.info("No candidates ranked yet. Please upload and process resumes first.")
    st.stop()

results = st.session_state.workflow_state["match_results"]
candidates = st.session_state.workflow_state["candidates"]
cand_map = {c.id: c for c in candidates}

# Selection
cand_options = {r.candidate_id: f"{r.candidate_name} - {r.status} ({r.final_score*100:.1f}%)" for r in results}
selected_id = st.selectbox("Select Candidate to Analyze", options=list(cand_options.keys()), format_func=lambda x: cand_options[x])

mr = next((r for r in results if r.candidate_id == selected_id), None)
cand = cand_map[selected_id]

if mr and cand:
    col_chart, col_details = st.columns([1, 1])
    
    with col_chart:
        st.subheader("Match Analysis Radar")
        df_radar = pd.DataFrame(dict(
            r=[mr.semantic_score, mr.skill_score, mr.experience_score, mr.project_score, mr.education_score],
            theta=['Semantic Match', 'Skills Score', 'Experience', 'Projects', 'Academic']
        ))
        
        fig = px.line_polar(df_radar, r='r', theta='theta', line_close=True, range_r=[0,1])
        # Using professional Indigo theme colors
        fig.update_traces(fill='toself', fillcolor='rgba(129, 140, 248, 0.3)', line_color='#818CF8')
        fig.update_layout(
            polar=dict(
                radialaxis=dict(visible=True, range=[0, 1], gridcolor="#334155"),
                angularaxis=dict(gridcolor="#334155")
            ),
            plot_bgcolor='rgba(0,0,0,0)',
            paper_bgcolor='rgba(0,0,0,0)',
            font=dict(color='#CBD5E1')
        )
        st.plotly_chart(fig, use_container_width=True)

    with col_details:
        st.subheader("AI Analysis Summary")
        st.info(mr.semantic_explanation)
        
        st.markdown("### Skills Comparison")
        if mr.matched_skills:
            st.markdown("#### Matched Skills")
            html_m = "".join([f"<span class='skill-chip matched'>{s}</span>" for s in mr.matched_skills])
            st.markdown(html_m, unsafe_allow_html=True)
            
        if mr.missing_skills:
            st.markdown("#### Missing Requirements")
            html_miss = "".join([f"<span class='skill-chip missing'>{s}</span>" for s in mr.missing_skills])
            st.markdown(html_miss, unsafe_allow_html=True)
            
    st.divider()
    st.subheader("Candidate Details")
    st.write(f"**Total Professional Experience:** {cand.total_experience_years} years")
    st.write(f"**Email:** {cand.email} | **Phone:** {cand.phone}")
    
    with st.expander("View Projects"):
        for p in cand.projects:
            st.markdown(f"**{p.name}**")
            st.write(p.description)
            techs = ", ".join(p.technologies)
            st.caption(f"Tech: {techs}")
            st.divider()
