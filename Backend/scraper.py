from __future__ import annotations
import re
from typing import Tuple
import requests
from bs4 import BeautifulSoup, NavigableString, Tag

HEADERS = {
    "User-Agent": "ai-quiz-generator/1.0 (+educational; contact: example@example.com)"
}

def _collapse_ws(text: str) -> str:
    return re.sub(r"\s+\n", "\n", re.sub(r"[ \t]{2,}", " ", text)).strip()

def scrape_wikipedia(url: str, timeout: int = 15) -> Tuple[str, str]:
    """
    Fetch a Wikipedia article and return (title, cleaned_text).

    Cleaning rules:
      - target main body: #mw-content-text .mw-parser-output
      - remove: tables (infobox, TOC), references (sup), edit sections,
                navboxes, infoboxes, sidebars, styles/scripts
    """
    # 1) fetch
    resp = requests.get(url, headers=HEADERS, timeout=timeout)
    resp.raise_for_status()

    # 2) parse
    soup = BeautifulSoup(resp.text, "html.parser")

    # title
    h1 = soup.find("h1", id="firstHeading")
    title = h1.get_text(strip=True) if h1 else soup.title.get_text(strip=True).replace(" - Wikipedia", "")

    # 3) locate main content container
    content = soup.select_one("#mw-content-text .mw-parser-output")
    if content is None:
        # fallback: whole page (rare)
        content = soup.body or soup

    # 4) remove unwanted elements
    selectors_to_remove = [
        "table.infobox", "table.toc", "table.vertical-navbox", "table.metadata",
        "div.navbox", "div.reflist", "div.mw-references-wrap", "ol.references",
        "span.mw-editsection", "div#toc", "div.hatnote", "style", "script",
        "table",  # any remaining tables
        "sup.reference", "span.reference"
    ]
    for sel in selectors_to_remove:
        for el in content.select(sel):
            el.decompose()

    # also remove citation superscripts not caught by class
    for sup in content.find_all("sup"):
        if "reference" in " ".join(sup.get("class", [])) or sup.find("a", href=re.compile(r"#cite")):
            sup.decompose()

    # 5) collect readable paragraphs (and plain list items)
    parts: list[str] = []
    for node in content.children:
        if isinstance(node, NavigableString):
            continue
        if not isinstance(node, Tag):
            continue
        # paragraphs
        if node.name == "p":
            txt = node.get_text(" ", strip=True)
            if txt:
                parts.append(txt)
        # simple list items
        elif node.name in {"ul", "ol"}:
            items = []
            for li in node.find_all("li", recursive=False):
                t = li.get_text(" ", strip=True)
                if t:
                    items.append(f"• {t}")
            if items:
                parts.append("\n".join(items))
        # stop before “References/External links/See also” sections
        elif node.name in {"h2", "h3"}:
            heading = node.get_text(" ", strip=True).lower()
            if any(k in heading for k in ["references", "external links", "see also", "notes", "further reading"]):
                break

    text = _collapse_ws("\n\n".join(parts))

    return title, text

if __name__ == "__main__":
    test_urls = [
        "https://en.wikipedia.org/wiki/MEAN_(solution_stack)",  
        "https://en.wikipedia.org/wiki/React_(software)",
        "https://en.wikipedia.org/wiki/Node.js",
        "https://en.wikipedia.org/wiki/MongoDB",
        "https://en.wikipedia.org/wiki/Express.js"
    ]

    for url in test_urls:
        print("\nTesting:", url)
        try:
            title, text = scrape_wikipedia(url)
            print("TITLE:", title)
            print("TEXT (first 400 chars):\n", text[:400], "...")
        except Exception as e:
            print("Error:", e)
