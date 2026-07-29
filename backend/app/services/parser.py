import fitz  # PyMuPDF
import pdfplumber
import docx
import io
import logging

logger = logging.getLogger("smarthire.parser")

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text using PyMuPDF first, falling back to pdfplumber if needed."""
    text = ""
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        for page in doc:
            text += page.get_text("text") + "\n"
        doc.close()
    except Exception as e:
        logger.warning(f"PyMuPDF extraction failed: {e}. Trying pdfplumber...")

    if not text.strip():
        try:
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                for page in pdf.pages:
                    extracted = page.extract_text()
                    if extracted:
                        text += extracted + "\n"
        except Exception as e:
            logger.error(f"pdfplumber extraction also failed: {e}")

    return text.strip()

def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract text from Word DOCX document."""
    try:
        doc = docx.Document(io.BytesIO(file_bytes))
        full_text = [para.text for para in doc.paragraphs]
        return "\n".join(full_text).strip()
    except Exception as e:
        logger.error(f"DOCX extraction failed: {e}")
        return ""

def parse_resume_file(filename: str, file_bytes: bytes) -> str:
    """Detect file type and extract raw resume text."""
    fname_lower = filename.lower()
    if fname_lower.endswith(".pdf"):
        return extract_text_from_pdf(file_bytes)
    elif fname_lower.endswith(".docx") or fname_lower.endswith(".doc"):
        return extract_text_from_docx(file_bytes)
    elif fname_lower.endswith(".txt"):
        return file_bytes.decode("utf-8", errors="ignore").strip()
    else:
        # Best effort text decode
        return file_bytes.decode("utf-8", errors="ignore").strip()
