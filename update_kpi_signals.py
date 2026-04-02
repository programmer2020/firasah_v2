import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
import re
import json

# Word file path
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
}

# Extract all text content with structure
kpi_mapping = {}
current_kpi = None
current_section = None
detection_signals = []

# Get all text elements
text_elements = []
for t in root.findall('.//w:t', ns):
    if t.text:
        text_elements.append(t.text)

full_text = ''.join(text_elements)

# Parse the text to extract KPI -> Detection Signals mapping
# Look for patterns like "1.1a" followed by "Detection Signals" header and content
lines = full_text.split('\n')

kpi_data = {}

# More robust parsing - look for Detection Signals followed by content
pattern = r'Detection Signals\s*["\']?([^"\']+)["\']?(?=Evidence Notes|Split Rationale|===|$)'

# Find all KPI codes
kpi_pattern = r'(\d\.\d[a-c]?)'

# Extract section by section
i = 0
text_parts = full_text.split('Detection Signals')

for idx, part in enumerate(text_parts[1:]):  # Skip the first split as it's before any Detection Signals
    if idx > 0:
        # Find the KPI code near this Detection Signals section
        search_text = text_parts[idx] if idx < len(text_parts) else ''
        
        # Get text before and after
        prev_text = text_parts[idx][:500] if idx < len(text_parts) else ''
        
        # Find KPI code
        kpi_match = re.search(r'(\d\.\d[a-c])', prev_text[::-1])
        if kpi_match:
            kpi_code = kpi_match.group(1)[::-1]  # Reverse back
            
            # Extract detection signals (content after "Detection Signals" until "Evidence Notes")
            signals_text = part.split('Evidence Notes')[0] if 'Evidence Notes' in part else part[:500]
            
            # Clean up the text
            signals_text = signals_text.strip()
            # Remove quote marks and clean
            signals_text = signals_text.replace('"', '').replace("'", '').strip()
            
            # Remove numbers and periods at the start of lines (numbered list items)
            # Convert numbered list to comma-separated
            numbers = re.findall(r'\d+\.\s+([^(?=\d+\.)]+)', signals_text)
            if numbers:
                detection_signals_clean = ', '.join([n.strip() for n in numbers])
            else:
                detection_signals_clean = signals_text
            
            if kpi_code not in kpi_data:
                kpi_data[kpi_code] = detection_signals_clean

print("\n=== KPI Detection Signals Mapping ===")
for kpi_code in sorted(kpi_data.keys(), key=lambda x: (float(x.split('.')[0]), float(x.split('.')[1]))):
    signals = kpi_data[kpi_code]
    print(f"\n{kpi_code}:")
    print(f"  {signals[:200]}...")

# Save to JSON for verification
with open('kpi_detection_signals.json', 'w', encoding='utf-8') as f:
    json.dump(kpi_data, f, ensure_ascii=False, indent=2)

print(f"\n✓ Extracted {len(kpi_data)} KPIs")
print("✓ Saved to kpi_detection_signals.json")
