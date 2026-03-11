#!/usr/bin/env python3
"""Convert case law and additional laws into the standard ingestion format."""
import json
import os

DATA_DIR = "/home/user/workspace/casemap/data"

# ========================================
# 1. Convert case_law_collection.json
# ========================================
case_law_path = os.path.join(DATA_DIR, "case_law_collection.json")
if os.path.exists(case_law_path):
    with open(case_law_path) as f:
        cl = json.load(f)
    
    cases = cl.get("case_law", [])
    
    # Group cases by category for organization
    by_cat = {}
    for case in cases:
        cat = case.get("category", "general")
        if cat not in by_cat:
            by_cat[cat] = []
        by_cat[cat].append(case)
    
    # Create one law entry per category of case law
    laws = []
    for cat, cat_cases in by_cat.items():
        law_id = f"LB-CASELAW-{cat.upper().replace(' ', '-')}"
        
        key_articles = []
        for i, case in enumerate(cat_cases, 1):
            # Build comprehensive text from all case fields
            parts = []
            if case.get("summary"):
                parts.append(case["summary"])
            if case.get("legal_principles"):
                principles = case["legal_principles"]
                if isinstance(principles, list):
                    parts.append("Legal principles established: " + "; ".join(principles))
                else:
                    parts.append(f"Legal principles: {principles}")
            if case.get("articles_cited"):
                articles = case["articles_cited"]
                if isinstance(articles, list):
                    parts.append("Articles cited: " + ", ".join(articles))
                else:
                    parts.append(f"Articles cited: {articles}")
            
            content = " ".join(parts) if parts else case.get("title", "No details available.")
            
            # Build subject from title and court
            court = case.get("court", "Lebanese Court")
            case_num = case.get("case_number", "")
            date = case.get("date", "")
            title = case.get("title", f"Case {i}")
            
            subject = f"[CASE LAW] {court}"
            if case_num:
                subject += f" - {case_num}"
            if date:
                subject += f" ({date})"
            
            key_articles.append({
                "article_number": case.get("case_id", f"CASE-{i}"),
                "text_english": content,
                "subject": subject,
                "title": title,
                "content": content,
            })
        
        cat_label = cat.replace("_", " ").title()
        laws.append({
            "law_id": law_id,
            "official_title_english": f"Case Law Collection - {cat_label}",
            "official_title_arabic": f"اجتهادات قضائية - {cat_label}",
            "category": cat,
            "subcategory": "case_law",
            "status": "active",
            "historical_context": f"Collection of {len(cat_cases)} judicial decisions and court rulings in {cat_label} law from Lebanese courts including the Court of Cassation, Courts of Appeal, Constitutional Council, Council of State, and specialized tribunals. These decisions establish important legal precedents in Lebanese jurisprudence.",
            "key_articles": key_articles,
        })
    
    output = {"laws": laws}
    output_path = os.path.join(DATA_DIR, "case_law_formatted.json")
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    total_cases = sum(len(l["key_articles"]) for l in laws)
    print(f"Case law: {len(laws)} categories, {total_cases} decisions -> {output_path}")

# ========================================
# 2. Convert additional_laws_collection.json
# ========================================
addl_path = os.path.join(DATA_DIR, "additional_laws_collection.json")
if os.path.exists(addl_path):
    with open(addl_path) as f:
        al = json.load(f)
    
    add_laws = al.get("additional_laws", [])
    
    laws = []
    for law in add_laws:
        articles = law.get("articles", [])
        if not articles:
            continue
            
        key_articles = []
        for art in articles:
            content = art.get("content", "")
            if not content or len(content) < 10:
                continue
            
            title = art.get("title", "")
            text = content
            if title and title not in content:
                text = f"{title}: {content}"
            
            key_articles.append({
                "article_number": str(art.get("number", "")),
                "text_english": text,
                "subject": title or None,
            })
        
        if not key_articles:
            continue
            
        laws.append({
            "law_id": law["id"],
            "official_title_english": law.get("title_en", ""),
            "official_title_arabic": law.get("title_ar", ""),
            "category": law.get("category", ""),
            "subcategory": law.get("subcategory", ""),
            "date_enacted": law.get("date_enacted", ""),
            "status": "active",
            "historical_context": law.get("historical_context", ""),
            "total_articles": len(key_articles),
            "key_articles": key_articles,
        })
    
    output = {"laws": laws}
    output_path = os.path.join(DATA_DIR, "additional_laws_formatted.json")
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    total_arts = sum(len(l["key_articles"]) for l in laws)
    print(f"Additional laws: {len(laws)} laws, {total_arts} articles -> {output_path}")


print("\nDone! New files ready for ingestion.")
