# Identification prompt

TASK: Extract unique stem cell line identifiers from the research article you have been given as an input.


PREFERRED FORMAT (Registry IDs):
Look first for official registry identifiers with this pattern:
- [INSTITUTE][TYPE][NUMBERS][-VARIANT]
- Institute: 2-6 uppercase letters (e.g., AIBN, UQ, LEI, MCRI)
- Type: lowercase 'i' or 'e'
- Numbers: exactly 3 digits (e.g., 001, 002, 010)
- Variant: optional hyphen + uppercase letter (e.g., -A, -B)
- Examples: AIBNi001, MCRIi001-A, UQi004-A, LEIe003-A, MICCNi001-B

ALTERNATIVE FORMATS:
If no registry IDs are found, extract whatever identifiers the article uses for the newly derived cell lines:
- Laboratory codes: hES3.1, hES3.2, Clone-1, Line-A
- Descriptive names: SIVF001, SIVF002, Control-iPSC
- Numbered series: iPSC-1, iPSC-2, hiPSC-clone-3
- Any consistent naming used for the derived lines

IMPORTANT RULES:
1. Focus on cell lines NEWLY DERIVED/GENERATED in this study
2. Ignore commercial cell lines, controls from other studies, or parental lines
3. Ignore generic terms like "iPSC line" or "control cells"
4. Return EXACTLY as the identifiers appear in the paper
5. Each identifier should appear only once in your list

OUTPUT FORMAT:
Return a valid Python list with quoted strings.

Return only the list or -1, nothing else.

EXAMPLES:
- Registry IDs: ["AIBNi001", "AIBNi002", "MCRIi001-A"]
- Alternative names: ["hES3.1", "hES3.2", "hES3.3"]
- Mixed formats: ["SIVF001", "SIVF002", "Control-line"]
- For no new cell lines: -1

"""