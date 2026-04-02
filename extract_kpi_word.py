import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
import json

# Find the Word document
word_file = Path(r'C:\Users\lenovo\Downloads\MoE KPI Revised 19.docx')

if not word_file.exists():
    print(f"Word file not found: {word_file}")
    exit(1)

print(f"Found: {word_file}")

# Extract content from docx
with zipfile.ZipFile(word_file, 'r') as zip_ref:
    xml_content = zip_ref.read('word/document.xml')

# Parse XML with namespaces
root = ET.fromstring(xml_content)
ns = {
    'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
    'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
    'pic': 'http://schemas.openxmlformats.org/drawingml/2006/picture'
}

# Extract tables
kpi_data = {}

for tbl in root.findall('.//w:tbl', ns):
    rows = tbl.findall('.//w:tr', ns)
    
    # Get header row
    header_row = rows[0] if rows else None
    if not header_row:
        continue
    
    headers = []
    for cell in header_row.findall('.//w:tc', ns):
        text_parts = []
        for t in cell.findall('.//w:t', ns):
            if t.text:
                text_parts.append(t.text)
        headers.append(''.join(text_parts))
    
    print(f"\n=== Table Headers ===")
    print(headers)
    
    # Get data rows
    for row in rows[1:]:
        cells = row.findall('.//w:tc', ns)
        row_data = []
        for cell in cells:
            text_parts = []
            for t in cell.findall('.//w:t', ns):
                if t.text:
                    text_parts.append(t.text)
            row_data.append(''.join(text_parts))
        
        if row_data and any(row_data):
            print(f"\nRow: {row_data}")

print("\n=== Full document text (first 2000 chars) ===")
all_text = []
for t in root.findall('.//w:t', ns):
    if t.text:
        all_text.append(t.text)
text = ''.join(all_text)
print(text[:2000])
