import fitz  # PyMuPDF
import pdfplumber
import os

def extract_text_pymupdf(pdf_path: str) -> str:
    """Extract text from a PDF document using PyMuPDF (fastest)."""
    text = ""
    try:
        with fitz.open(pdf_path) as doc:
            for page in doc:
                text += page.get_text() + "\n"
    except Exception as e:
        print(f"PyMuPDF failed on {pdf_path}: {e}")
    return text.strip()

def extract_text_pdfplumber(pdf_path: str) -> str:
    """Extract text from a PDF using pdfplumber (best for complex layouts)."""
    text = ""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
    except Exception as e:
        print(f"pdfplumber failed on {pdf_path}: {e}")
    return text.strip()

def extract_text(pdf_path: str) -> str:
    """
    Main extraction function. Tries PyMuPDF first for speed. 
    If text length is suspiciously short, falls back to pdfplumber.
    """
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"Resume file not found: {pdf_path}")

    text = extract_text_pymupdf(pdf_path)
    
    # If very little text is extracted, the PDF might be an image or complex layout
    if len(text) < 100:
        fallback_text = extract_text_pdfplumber(pdf_path)
        if len(fallback_text) > len(text):
            text = fallback_text

    return text
