#!/usr/bin/env python3
"""
Parse Lebanese legal code PDFs into structured JSON files
that the Case Map ingestion pipeline can consume.

Strategy:
1. Extract full text from PDF
2. Use regex to identify Article boundaries
3. Group articles with their full text
4. Output in the same JSON schema as existing data files
"""
import subprocess
import re
import json
import os
import sys

SOURCES_DIR = os.path.join(os.path.dirname(__file__), "..", "sources")
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")


def extract_pdf_text(pdf_path: str) -> str:
    """Extract text from PDF using pdftotext (poppler-utils)."""
    try:
        result = subprocess.run(
            ["pdftotext", "-layout", pdf_path, "-"],
            capture_output=True, text=True, timeout=60
        )
        if result.returncode == 0:
            return result.stdout
    except FileNotFoundError:
        pass
    
    # Fallback: use python
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(pdf_path)
        text = ""
        for page in doc:
            text += page.get_text() + "\n"
        return text
    except ImportError:
        pass
    
    # Last resort: basic extraction
    result = subprocess.run(
        ["python3", "-c", f"""
import sys
try:
    from PyPDF2 import PdfReader
    reader = PdfReader("{pdf_path}")
    for page in reader.pages:
        print(page.extract_text() or "")
except:
    print("EXTRACTION_FAILED", file=sys.stderr)
"""],
        capture_output=True, text=True, timeout=120
    )
    return result.stdout


def parse_articles(text: str) -> list:
    """Parse text into individual articles."""
    # Match patterns like "Article 1", "Article 1 -", "Article 1.", "Article 1 –"
    # Also handle "Article 1 (as modified by...)"
    pattern = r'(?:^|\n)\s*Article\s+(\d+[a-z]?(?:\.\d+)?)\s*[\-–\.\s\(]'
    
    matches = list(re.finditer(pattern, text, re.IGNORECASE | re.MULTILINE))
    
    if not matches:
        # Try alternate pattern for some PDFs
        pattern = r'(?:^|\n)\s*Art(?:icle)?\.?\s+(\d+[a-z]?(?:\.\d+)?)\s*[\-–\.\s\(]'
        matches = list(re.finditer(pattern, text, re.IGNORECASE | re.MULTILINE))
    
    articles = []
    for i, match in enumerate(matches):
        art_num = match.group(1)
        start = match.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else min(start + 3000, len(text))
        
        art_text = text[start:end].strip()
        # Clean up the text
        art_text = re.sub(r'\s+', ' ', art_text)  # Normalize whitespace
        art_text = art_text[:2000]  # Cap length per article
        
        # Remove the "Article N" prefix from the text body for cleaner storage
        clean_text = re.sub(r'^Article\s+\d+[a-z]?(?:\.\d+)?\s*[\-–\.]\s*', '', art_text, flags=re.IGNORECASE).strip()
        
        if len(clean_text) > 20:  # Skip empty/trivial articles
            articles.append({
                "article_number": art_num,
                "text_english": clean_text,
                "current_version": True
            })
    
    return articles


def deduplicate_articles(articles: list) -> list:
    """Keep only the last occurrence of each article number (most recent version)."""
    seen = {}
    for art in articles:
        num = art["article_number"]
        seen[num] = art  # Last one wins
    return list(seen.values())


def infer_subjects(articles: list) -> list:
    """Add subject hints based on content keywords."""
    subject_patterns = {
        r'\bpenalt(?:y|ies)\b|\bimprisonment\b|\bfine\b|\bsentenc': 'Penalties and sentencing',
        r'\bmurder\b|\bhomicide\b|\bkill': 'Homicide',
        r'\btheft\b|\bsteal\b|\brob': 'Theft and robbery',
        r'\bfraud\b|\bswindle\b|\bcheat': 'Fraud',
        r'\bassault\b|\bbatter\b|\bwound': 'Assault and battery',
        r'\bcontract\b|\bagreement\b|\bobligation': 'Contracts and obligations',
        r'\blease\b|\brent\b|\btenant\b|\blandlord': 'Lease and tenancy',
        r'\bsale\b|\bsell\b|\bpurchas': 'Sale of goods',
        r'\bmortgage\b|\bhypothec': 'Mortgage',
        r'\binsurance\b|\bpolicy\b|\bpremium': 'Insurance',
        r'\bagenc\b|\bmandat\b|\bproxy': 'Agency',
        r'\bguarant\b|\bsurety\b|\bbail': 'Guarantees and sureties',
        r'\bdamage\b|\bliabil\b|\bfault\b|\btort': 'Liability and damages',
        r'\bemploye[re]\b|\bworker\b|\blabou?r\b|\bwage': 'Employment and labor',
        r'\btermina\b|\bdismiss\b|\bseverance': 'Termination of employment',
        r'\bcompan(?:y|ies)\b|\bcorporation\b|\bshareholder': 'Companies and corporate',
        r'\bbankrupt\b|\binsolven': 'Bankruptcy and insolvency',
        r'\bcheque\b|\bcheck\b|\bnegotiable\b|\bbill of exchange': 'Negotiable instruments',
        r'\bbank\b|\bcredit\b|\bloan\b|\binterest': 'Banking and credit',
        r'\btax\b|\bduty\b|\bfiscal\b|\bstamp': 'Taxation',
        r'\bmarriage\b|\bdivorce\b|\bcustody': 'Family law',
        r'\binherit\b|\bsuccession\b|\bwill\b|\btestament': 'Inheritance and succession',
        r'\bproperty\b|\bimmovable\b|\breal estate\b|\bland': 'Property law',
        r'\bcitizenship\b|\bnational\b|\bpassport': 'Nationality and citizenship',
        r'\bextraditi': 'Extradition',
        r'\bdefam\b|\blibel\b|\bslander': 'Defamation',
        r'\bforg\b|\bcounterfeit': 'Forgery and counterfeiting',
        r'\bdrug\b|\bnarcotic\b|\bsubstance': 'Narcotics',
        r'\bchild\b|\bminor\b|\bjuvenile': 'Minors and juvenile',
        r'\bwoman\b|\bwomen\b|\bmaternit': 'Women\'s rights',
        r'\bvote\b|\belect': 'Electoral',
        r'\bpress\b|\bpublicat\b|\bmedia': 'Press and media',
    }
    
    for art in articles:
        text = art.get("text_english", "").lower()
        for pattern, subject in subject_patterns.items():
            if re.search(pattern, text, re.IGNORECASE):
                art["subject"] = subject
                break
    
    return articles


def process_penal_code():
    """Process the Lebanese Penal Code."""
    pdf_path = os.path.join(SOURCES_DIR, "penal_code_full.pdf")
    if not os.path.exists(pdf_path):
        print("Penal Code PDF not found, skipping")
        return
    
    print("Processing Penal Code...")
    text = extract_pdf_text(pdf_path)
    print(f"  Extracted {len(text)} characters")
    
    articles = parse_articles(text)
    articles = deduplicate_articles(articles)
    articles = infer_subjects(articles)
    print(f"  Parsed {len(articles)} unique articles")
    
    output = {
        "metadata": {
            "file": "penal_code_expanded.json",
            "description": "Expanded Penal Code - Full article-level text from STL English translation",
            "total_entries": 1,
            "source": "ccls-lebanon.org STL Draft Official Translation",
            "last_updated": "2026-03-11"
        },
        "laws": [{
            "law_id": "LB-CRIM-001-EXPANDED",
            "official_number": "Decree-Law No. 340 of March 1, 1943",
            "official_title_arabic": "قانون العقوبات",
            "official_title_french": "Code Pénal",
            "official_title_english": "Penal Code (Expanded)",
            "date_enacted": "1943-03-01",
            "category": "Criminal Law",
            "subcategory": "General Penal Code",
            "status": "amended",
            "total_articles": 772,
            "key_articles": articles,
            "historical_context": "Full article-level text of the Lebanese Penal Code (Decree-Law No. 340/1943), extracted from the STL (Special Tribunal for Lebanon) official English translation. This code is the primary criminal law legislation in Lebanon, covering general criminal provisions, felonies, misdemeanors, and contraventions."
        }]
    }
    
    out_path = os.path.join(DATA_DIR, "penal_code_expanded.json")
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    print(f"  Saved to {out_path}")
    return len(articles)


def process_labor_code():
    """Process the Lebanese Labor Code."""
    pdf_path = os.path.join(SOURCES_DIR, "labor_code_full.pdf")
    if not os.path.exists(pdf_path):
        print("Labor Code PDF not found, skipping")
        return
    
    print("Processing Labor Code...")
    text = extract_pdf_text(pdf_path)
    print(f"  Extracted {len(text)} characters")
    
    articles = parse_articles(text)
    articles = deduplicate_articles(articles)
    articles = infer_subjects(articles)
    print(f"  Parsed {len(articles)} unique articles")
    
    output = {
        "metadata": {
            "file": "labor_code_expanded.json",
            "description": "Expanded Labor Code - Full article-level text",
            "total_entries": 1,
            "source": "vertic.org comprehensive English translation",
            "last_updated": "2026-03-11"
        },
        "laws": [{
            "law_id": "LB-LAB-001-EXPANDED",
            "official_number": "Law of September 23, 1946 (Labor Code)",
            "official_title_arabic": "قانون العمل اللبناني",
            "official_title_french": "Code du Travail",
            "official_title_english": "Labor Code (Expanded)",
            "date_enacted": "1946-09-23",
            "category": "Labor & Social Security",
            "subcategory": "General Labor Code",
            "status": "amended",
            "total_articles": 113,
            "key_articles": articles,
            "historical_context": "Full article-level text of the Lebanese Labor Code (Law of September 23, 1946). This is the primary labor legislation governing employment relationships, working conditions, termination, unions, and labor dispute resolution in Lebanon."
        }]
    }
    
    out_path = os.path.join(DATA_DIR, "labor_code_expanded.json")
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    print(f"  Saved to {out_path}")
    return len(articles)


def process_commercial_code():
    """Process the Lebanese Commercial Code."""
    pdf_path = os.path.join(SOURCES_DIR, "commercial_code_full.pdf")
    if not os.path.exists(pdf_path):
        print("Commercial Code PDF not found, skipping")
        return
    
    print("Processing Commercial Code...")
    text = extract_pdf_text(pdf_path)
    print(f"  Extracted {len(text)} characters")
    
    articles = parse_articles(text)
    articles = deduplicate_articles(articles)
    articles = infer_subjects(articles)
    print(f"  Parsed {len(articles)} unique articles")
    
    output = {
        "metadata": {
            "file": "commercial_code_expanded.json",
            "description": "Expanded Commercial Code - Full article-level text",
            "total_entries": 1,
            "source": "data.infopro.com.lb official translation",
            "last_updated": "2026-03-11"
        },
        "laws": [{
            "law_id": "LB-COM-001-EXPANDED",
            "official_number": "Legislative Decree No. 304 of December 24, 1942",
            "official_title_arabic": "قانون التجارة",
            "official_title_french": "Code de Commerce",
            "official_title_english": "Commercial Code (Expanded)",
            "date_enacted": "1942-12-24",
            "category": "Commercial Law",
            "subcategory": "General Commercial Code",
            "status": "amended",
            "total_articles": 725,
            "key_articles": articles,
            "historical_context": "Full article-level text of the Lebanese Commercial Code (Legislative Decree No. 304/1942). Covers trade, merchants, commercial companies (partnerships, joint stock, limited liability), negotiable instruments, bankruptcy and insolvency, maritime commerce, and commercial agency."
        }]
    }
    
    out_path = os.path.join(DATA_DIR, "commercial_code_expanded.json")
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    print(f"  Saved to {out_path}")
    return len(articles)


def process_criminal_procedure():
    """Process the Code of Criminal Procedure."""
    pdf_path = os.path.join(SOURCES_DIR, "criminal_procedure_full.pdf")
    if not os.path.exists(pdf_path):
        print("Criminal Procedure Code PDF not found, skipping")
        return
    
    print("Processing Code of Criminal Procedure...")
    text = extract_pdf_text(pdf_path)
    print(f"  Extracted {len(text)} characters")
    
    articles = parse_articles(text)
    articles = deduplicate_articles(articles)
    articles = infer_subjects(articles)
    print(f"  Parsed {len(articles)} unique articles")
    
    output = {
        "metadata": {
            "file": "criminal_procedure_expanded.json",
            "description": "Expanded Code of Criminal Procedure - Full article-level text",
            "total_entries": 1,
            "source": "policehumanrightsresources.org English translation",
            "last_updated": "2026-03-11"
        },
        "laws": [{
            "law_id": "LB-CRIM-002-EXPANDED",
            "official_number": "Law No. 328 of August 7, 2001",
            "official_title_arabic": "قانون أصول المحاكمات الجزائية",
            "official_title_french": "Code de Procédure Pénale",
            "official_title_english": "Code of Criminal Procedure (Expanded)",
            "date_enacted": "2001-08-07",
            "category": "Criminal Law",
            "subcategory": "Criminal Procedure",
            "status": "amended",
            "total_articles": 420,
            "key_articles": articles,
            "historical_context": "Full article-level text of the Lebanese Code of Criminal Procedure (Law No. 328/2001). Governs criminal investigations, prosecution, trial procedures, evidence, detention, appeals, and execution of criminal judgments."
        }]
    }
    
    out_path = os.path.join(DATA_DIR, "criminal_procedure_expanded.json")
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    print(f"  Saved to {out_path}")
    return len(articles)


if __name__ == "__main__":
    total = 0
    
    r = process_penal_code()
    if r: total += r
    
    r = process_labor_code()
    if r: total += r
    
    r = process_commercial_code()
    if r: total += r
    
    r = process_criminal_procedure()
    if r: total += r
    
    print(f"\n=== TOTAL: {total} new articles extracted ===")
