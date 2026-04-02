#!/usr/bin/env python3
"""Extract content from the Landing page code.docx file"""

import glob
import os

# Try to find the docx file
docx_files = glob.glob('**/*.docx', recursive=True)
print(f"Found docx files: {docx_files}")

# Try common locations
locations = [
    'Landing page code.docx',
    './Landing page code.docx',
    os.path.expanduser('~/Downloads/Landing page code.docx'),
    os.path.expanduser('~/AppData/Local/Temp/Landing page code.docx'),
]

from docx import Document

for loc in locations:
    if os.path.exists(loc):
        print(f"Found at: {loc}")
        try:
            doc = Document(loc)
            with open('landing_content.txt', 'w', encoding='utf-8') as f:
                for p in doc.paragraphs:
                    f.write(p.text + '\n')
            print("Content extracted to landing_content.txt")
            break
        except Exception as e:
            print(f"Error reading {loc}: {e}")
