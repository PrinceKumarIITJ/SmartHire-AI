import streamlit as st
import os

# Global configuration
st.set_page_config(
    page_title="SmartHire AI | ATS System",
    page_icon="💼",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Initialize Session State Variables required globally
if "workflow_state" not in st.session_state:
    st.session_state.workflow_state = {
        "jd_text": "",
        "job_description": None,
        "resume_files": [],
        "candidates": [],
        "match_results": [],
        "email_logs": [],
        "shortlist_threshold": 0.6,
        "error": None
    }

# --- Sidebar: System Status & Controls ---
with st.sidebar:
    st.image("https://img.icons8.com/nolan/96/artificial-intelligence.png", width=64)
    st.markdown("<h2 style='margin-top:0;'>SmartHire AI</h2>", unsafe_allow_html=True)
    st.markdown("<p style='color:#94A3B8;font-size:0.9em;margin-top:-10px;'>Enterprise AI Candidate Screener</p>", unsafe_allow_html=True)
    st.divider()
    
    st.header("Ranking Cutoff")
    threshold_pct = st.slider("Shortlisting Cutoff (%)", 0, 100, int(st.session_state.workflow_state["shortlist_threshold"] * 100))
    st.session_state.workflow_state["shortlist_threshold"] = threshold_pct / 100.0
    st.info(f"Candidates with scores >= {threshold_pct}% will be Shortlisted.")

    st.divider()
    st.subheader("Agentic Orchestration")
    with st.expander("View LangGraph System", expanded=False):
        try:
            from agents.workflow import create_workflow
            graph_app = create_workflow()
            # Draw mermaid diagram of the graph
            mermaid_code = graph_app.get_graph().draw_mermaid()
            st.markdown("This multi-agent system runs on the following LangGraph schema:")
            st.markdown(f"```mermaid\n{mermaid_code}\n```")
        except Exception as e:
            st.caption(f"Graph visualization loaded: {e}")
            
    st.divider()

# Professional Styling (CSS)
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');

    .stApp {
        background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #020617 100%);
        color: #F8FAFC;
        font-family: 'Outfit', -apple-system, sans-serif;
    }
    .main .block-container {
        padding-top: 3rem;
    }
    h1, h2, h3, h4, h5 {
        font-family: 'Space Grotesk', sans-serif;
        color: #ffffff;
        font-weight: 600;
        letter-spacing: -0.02em;
    }
    h1 {
        background: linear-gradient(90deg, #818CF8 0%, #C084FC 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        border-bottom: 2px solid rgba(129, 140, 248, 0.2);
        padding-bottom: 12px;
        margin-bottom: 24px;
    }
    
    /* Glassmorphism card effects */
    .metric-card {
        background: rgba(30, 41, 59, 0.45);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border-radius: 16px;
        padding: 24px;
        box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
        border: 1px solid rgba(255, 255, 255, 0.08);
        transition: transform 0.2s ease, border-color 0.2s ease;
    }
    .metric-card:hover {
        transform: translateY(-2px);
        border-color: rgba(129, 140, 248, 0.3);
    }
    
    /* Customising Streamlit Metric display */
    div[data-testid="stMetric"] {
        background: rgba(30, 41, 59, 0.4);
        backdrop-filter: blur(8px);
        border-radius: 12px;
        padding: 16px;
        border: 1px solid rgba(255, 255, 255, 0.05);
        box-shadow: 0 4px 20px 0 rgba(0, 0, 0, 0.2);
        transition: all 0.3s ease;
    }
    div[data-testid="stMetric"]:hover {
        border-color: rgba(192, 132, 252, 0.25);
        box-shadow: 0 4px 25px 0 rgba(129, 140, 248, 0.15);
    }
    
    /* Skill Chips */
    .skill-chip {
        display: inline-block;
        padding: 5px 12px;
        margin: 4px;
        border-radius: 20px;
        font-size: 0.85em;
        font-weight: 500;
        background: rgba(71, 85, 105, 0.4);
        color: #E2E8F0;
        border: 1px solid rgba(255, 255, 255, 0.1);
        transition: all 0.2s ease;
    }
    .skill-chip:hover {
        background: rgba(129, 140, 248, 0.2);
        transform: scale(1.05);
    }
    .skill-chip.matched {
        background: rgba(6, 78, 59, 0.55);
        border-color: rgba(5, 150, 105, 0.6);
        color: #A7F3D0;
    }
    .skill-chip.matched:hover {
        background: rgba(6, 78, 59, 0.75);
    }
    .skill-chip.missing {
        background: rgba(127, 29, 29, 0.55);
        border-color: rgba(220, 38, 38, 0.6);
        color: #FECACA;
    }
    .skill-chip.missing:hover {
        background: rgba(127, 29, 29, 0.75);
    }
    
    /* Styled Buttons */
    .stButton>button {
        border-radius: 10px;
        font-weight: 600;
        font-family: 'Space Grotesk', sans-serif;
        background: linear-gradient(90deg, #4F46E5 0%, #7C3AED 100%);
        color: white;
        border: none;
        padding: 0.6rem 1.4rem;
        box-shadow: 0 4px 15px rgba(79, 70, 229, 0.4);
        transition: all 0.3s ease;
    }
    .stButton>button:hover {
        background: linear-gradient(90deg, #4338CA 0%, #6D28D9 100%);
        box-shadow: 0 6px 20px rgba(79, 70, 229, 0.6);
        transform: translateY(-1px);
        color: white;
    }
    
    /* Custom Sidebar styling */
    section[data-testid="stSidebar"] {
        background-color: #090d16 !important;
        border-right: 1px solid rgba(255, 255, 255, 0.05);
    }
    
    /* Input adjustments */
    div[data-testid="stTextArea"] textarea, div[data-testid="stTextInput"] input {
        background-color: rgba(15, 23, 42, 0.6) !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        border-radius: 10px !important;
        color: #F8FAFC !important;
    }
</style>
""", unsafe_allow_html=True)

# Navigation Menu
pages = {
    "Setup": [
        st.Page("pages/jd_upload.py", title="Design Job Description"),
        st.Page("pages/resume_upload.py", title="Import Resumes"),
    ],
    "Analysis & Ranking": [
        st.Page("pages/ranking_dashboard.py", title="Ranking Dashboard"),
        st.Page("pages/candidate_insights.py", title="Candidate Insights"),
        st.Page("pages/resume_chatbot.py", title="Resume Chatbot Q&A"),
        st.Page("pages/analytics_page.py", title="Hiring Analytics"),
    ],
    "Communication": [
        st.Page("pages/email_logs.py", title="Communication Logs"),
    ]
}

pg = st.navigation(pages)
pg.run()
