# LLM Curation Instructions

Auto-generated from: 2025_12_ascr_data_dictionary_v1.0.xlsx

Fields marked for LLM curation (`llm_curate = YES`).

## CellLine

| Field | Instruction |
|-------|-------------|
| `hpscreg_name` | Write the name of the cell line that you are currently curating. This should have been given to you in the prompt. |
| `cell_line_alt_name` | Alternative names for the cell line used in article, or "Missing" if none. Used semicolon separated values if multiple names. |
| `cell_type` | Select from schema literals (e.g., hiPSC, ESC) |
| `frozen` | Write "True" if the article mentions a stocked/archived date. "False" otherwise |

## Contact

| Field | Instruction |
|-------|-------------|
| `first_name` | Contact person's first name |
| `last_name` | Contact person's last name |

## Publication

| Field | Instruction |
|-------|-------------|
| `doi` | Digital Object Identifier |
| `pmid` | PubMed ID. This often cannot be found in the article however it is the filename stem in the article file you were given. |
| `first_author` | First author name |
| `last_author` | Last author name |
| `journal` | Journal name |
| `title` | Full article title |
| `year` | Publication year |

## DonorSource

| Field | Instruction |
|-------|-------------|
| `age` | Age range (see accepted values for how to represent age ranges) of the donor or "Missing" if not found. If the line was embryonically derived, write "EM". If fetus write FE or if neonatal write NEO. |
| `sex` | Biological sex of the donor or "Missing" if not found |

## Disease

| Field | Instruction |
|-------|-------------|
| `name` | Disease name or "Missing" if not found |
| `description` | Brief disease description or "Missing" if not found |

## CultureMedium

| Field | Instruction |
|-------|-------------|
| `co2_concentration` | CO₂ concentration or "Missing" if not found |
| `o2_concentration` | O₂ concentration or "Missing" if not found |
| `passage_method` | Write the passage method used to culture the cell line |

## GenomicAlteration

| Field | Instruction |
|-------|-------------|
| `mutation_type` | Type of genomic alteration or "Missing" if not found |
| `cytoband` | Chromosomal location or "Missing" if not found |
| `delivery_method` | How modification was delivered or "Missing" if not found |
| `description` | Modification description or "Missing" if not found |
| `genotype` | Write the genotype nomenclature for the genomic modification performed on this cell line, or "NM" if no modification, or "Missing" if not found |

## CharacterisationProtocolResult

| Field | Instruction |
|-------|-------------|
| `cell_type` | Cell type abbreviation from results |
| `show_potency` | Can differentiate into this type |
| `marker_list` | Differentiation markers as string |
| `differentiation_profile` | Write the method that was used to determine expression of the markers |

## UndifferentiatedCharacterisation

| Field | Instruction |
|-------|-------------|
| `epi_pluri_score` | EpiPluriScore result or "Missing" if not found |
| `pluri_test_score` | PluriTest score or "Missing" if not found |
| `pluri_novelty_score` | PluriTest novelty score or "Missing" if not found |

## GenomicCharacterisation

| Field | Instruction |
|-------|-------------|
| `passage_number` | Passage number from results |
| `karyotyped` | Chromosomal karyotype |
| `karyotype` | Write the karyotyping method used to perform the genomic characterisation  |
| `summary` | Concise results summary |

## NonIntegratedVector

| Field | Instruction |
|-------|-------------|
| `non_int_vector_name` | Non-integrating vector name or kit name |
| `non_int_vector` | Write the type of the non-integrating vector used for the induced derivation procedure for this cell line. |

## CellLineDerivationInducedPluripotent

| Field | Instruction |
|-------|-------------|
| `derivation_year` | Write the year that the cell line was derived in. This should be reported in the article, or otherwise, write the year the article was published. |

## CellLineDerivationEmbryonic

| Field | Instruction |
|-------|-------------|
| `e_preimplant_genetic_diagnosis` | e_preimplant_genetic_diagnosis |
| `derivation_year` | Write the year that the cell line was derived in. If the derivation year is unknown or not reported, use null. Do not use placeholder dates like 0000-01-01. |
| `embryo_stage` | embryo_stage |
| `icm_morphology` | icm_morphology |
| `trophectoderm_morphology` | trophectoderm_morphology |
| `zp_removal_technique` | zp_removal_technique |
