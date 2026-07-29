from fpdf import FPDF
import os

class ResumePDF(FPDF):
    def header(self):
        self.set_font('helvetica', 'B', 15)
        self.cell(0, 10, 'Candidate Resume', 0, 1, 'C')
        self.ln(5)

    def section_title(self, title):
        self.set_font('helvetica', 'B', 12)
        self.set_fill_color(200, 220, 255)
        self.cell(0, 8, title, 0, 1, 'L', True)
        self.ln(2)

    def section_body(self, body):
        self.set_font('helvetica', '', 10)
        self.multi_cell(0, 5, body)
        self.ln(5)

def create_resume(filepath, name, email, summary, exp, edu, skills):
    pdf = ResumePDF()
    pdf.add_page()
    
    # Personal Info
    pdf.set_font('helvetica', 'B', 14)
    pdf.cell(0, 10, name, 0, 1, 'L')
    pdf.set_font('helvetica', '', 10)
    pdf.cell(0, 5, f'Email: {email} | Location: Worldwide', 0, 1, 'L')
    pdf.ln(5)

    # Summary
    pdf.section_title('Summary')
    pdf.section_body(summary)

    # Experience
    pdf.section_title('Work Experience')
    pdf.section_body(exp)

    # Education
    pdf.section_title('Education')
    pdf.section_body(edu)

    # Skills
    pdf.section_title('Skills')
    pdf.section_body(skills)

    pdf.output(filepath)
    print(f"Resume created: {filepath}")

if __name__ == "__main__":
    os.makedirs("samples", exist_ok=True)
    
    # 1. Perfect Match (Selected)
    create_resume(
        "samples/selected_senior_dev.pdf",
        "Jane Smith", "jane.smith@email.com",
        "Senior Backend Engineer with 8 years of experience. Expert in Python, FastAPI, and Cloud Native architectures.",
        "Lead Backend Developer | TechGiants (2019-2024)\n- Designed microservices for AI processing using FastAPI and AWS.\n- Integrated LangChain for RAG-based systems.\n- PostgreSQL and Redis optimization.",
        "M.S. in Computer Science | Stanford University",
        "Python, FastAPI, Django, AWS, LangChain, PostgreSQL, Redis, Docker, Kubernetes"
    )

    # 2. Average Match (Borderline)
    create_resume(
        "samples/borderline_python_dev.pdf",
        "Michael Wilson", "michael.w@email.com",
        "Product-focused Python Developer with 4 years experience in web application development.",
        "Python Developer | Cloud Solutions (2020-2024)\n- Developed REST APIs using Django and Flask.\n- Managed SQL databases and improved query performance.",
        "B.S. in Software Engineering | State University",
        "Python, Django, Flask, PostgreSQL, SQL, Git, Linux"
    )

    # 3. Rejected - Underqualified (Junior)
    create_resume(
        "samples/rejected_junior.pdf",
        "Emily Davis", "emily.d@email.com",
        "Aspiring Software Developer and recent graduate. Passionate about learning Python and web technologies.",
        "Junior Intern | CodeCamp (2023-2024)\n- Assisted in building simple website scripts using Python.\n- Fixed bugs in HTML/CSS templates.",
        "B.S. in Computer Science | City College (2023)",
        "Python (Basic), HTML, CSS, JavaScript, MySQL"
    )

    # 4. Rejected - Wrong Role (Designer)
    create_resume(
        "samples/rejected_designer.pdf",
        "Robert Brown", "robert.b@email.com",
        "Creative UI/UX Designer with a strong background in branding and interactive design.",
        "Senior Designer | Creative Studio (2018-2024)\n- Led branding for 20+ startup clients.\n- Designed complex mobile app interfaces in Figma.",
        "B.A. in Graphic Design | Art Institute",
        "Figma, Adobe XD, Photoshop, Illustrator, User Research, Prototyping"
    )
