import streamlit as st
import pandas as pd
import plotly.express as px
from services.analytics import compute_summary_stats, get_top_skills, compute_skill_gap

st.title("Hiring Analytics")
st.markdown("Overview of the candidate pipeline and skill gap analysis.")

if not st.session_state.workflow_state.get("match_results"):
    st.info("No data available. Process resumes to generate analytics.")
    st.stop()

results = st.session_state.workflow_state["match_results"]
candidates = st.session_state.workflow_state["candidates"]
jd = st.session_state.workflow_state.get("job_description")

stats = compute_summary_stats(results)

# KPIs
c1, c2, c3, c4 = st.columns(4)
c1.metric("Total Applicants", stats["total"])
c2.metric("Shortlisted", stats["shortlisted"])
c3.metric("Rejected", stats["rejected"])
c4.metric("Avg Score", f"{stats['avg_score']*100:.1f}%")

st.divider()

col_charts, col_skills = st.columns([1, 1])

with col_charts:
    st.subheader("Score Distribution")
    scores = [r.final_score * 100 for r in results]
    fig_hist = px.histogram(x=scores, nbins=10, labels={'x': 'Score (%)', 'y': 'Count'})
    fig_hist.update_layout(
        plot_bgcolor='rgba(0,0,0,0)', 
        paper_bgcolor='rgba(0,0,0,0)', 
        font=dict(color='#CBD5E1')
    )
    fig_hist.update_traces(marker_color='#4F46E5')
    st.plotly_chart(fig_hist, use_container_width=True)

    st.subheader("Selection Ratio")
    fig_pie = px.pie(names=['Shortlisted', 'Rejected'], values=[stats["shortlisted"], stats["rejected"]], 
                     color_discrete_sequence=['#059669', '#DC2626'])
    fig_pie.update_layout(plot_bgcolor='rgba(0,0,0,0)', paper_bgcolor='rgba(0,0,0,0)', font=dict(color='#CBD5E1'))
    st.plotly_chart(fig_pie, use_container_width=True)

with col_skills:
    st.subheader("Aggregate Skill Distribution")
    top_skills = get_top_skills(candidates)
    
    if top_skills:
        df_skills = pd.DataFrame(list(top_skills.items()), columns=['Skill', 'Count']).head(10)
        fig_bar = px.bar(df_skills, x='Count', y='Skill', orientation='h')
        fig_bar.update_layout(
            yaxis={'categoryorder':'total ascending'}, 
            plot_bgcolor='rgba(0,0,0,0)', 
            paper_bgcolor='rgba(0,0,0,0)', 
            font=dict(color='#CBD5E1')
        )
        fig_bar.update_traces(marker_color='#818CF8')
        st.plotly_chart(fig_bar, use_container_width=True)
    
    if jd:
        st.subheader("Requirement Alignment Analysis")
        gap_data = compute_skill_gap(jd, candidates)
        if gap_data:
            df_gap = pd.DataFrame(gap_data)
            st.dataframe(df_gap, use_container_width=True)
        else:
            st.write("No defined requirements for alignment analysis.")
