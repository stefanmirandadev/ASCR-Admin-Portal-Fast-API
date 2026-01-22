# Stefan's Data Dictionary Change Record

This file records changes made to `2025_12_ascr_data_dictionary_v1.0.xlsx` during development. These changes need to be synced with the maintainer's master copy.

---

## Change Log

### 2026-01-20: CellLineDerivationEmbryonic.derivation_year - LLM instruction update

**Table:** CellLineDerivationEmbryonic
**Field:** derivation_year
**Column Changed:** llm_instructions (column O)

**Reason:**
The LLM was returning `0000-01-01` as a placeholder date when derivation year was unknown, causing Pydantic validation errors (year 0 is out of range).

**Changes Made:**
1. Set `llm_curate` (column N) to `YES`
2. Added `llm_instructions` (column O): "Write the year that the cell line was derived in. If the derivation year is unknown or not reported, use null. Do not use placeholder dates like 0000-01-01."

**Previous Values:**
- `llm_curate`: (empty)
- `llm_instructions`: (empty)

---
