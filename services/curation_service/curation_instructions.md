# AI Metadata Extraction Instructions

## Task Overview
Extract structured metadata about stem cell lines from scientific research articles. Return all data as a single JSON object following the schema provided separately.

## General Guidelines
- Extract information exactly as presented in the article
- Use "Missing" for missing scalar/string fields (maintain JSON structure)
- For boolean fields, use `true` or `false` (not strings)
- For array fields, always return array with object containing "Missing" values for all fields if no relevant data found
- IMPORTANT: Never return empty arrays `[]` or use "Missing" for array fields.
- Follow exact field names and accepted values specified below
- If there accepted valued specified for a field you must follow those accepted values.

## Required Metadata Fields

### 1. Basic Data (`basic_data` array)

| Field                | Instructions                                                                                                               |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `hpscreg_name`       | Write the name of the cell line that you are currently curating. This should have been given to you in the prompt.         |
| `cell_line_alt_name` | Alternative names for the cell line used in article, or "Missing" if none. Used semicolon separated values if multiple names. |
| `cell_type`          | Select from schema literals (e.g., hiPSC, ESC)                                                                             |
| `frozen`             | Write "True" if the article mentions a stocked/archived date. "False" otherwise                                            |

**Example:**
```json
basic_data: [
	{
		cell_line_alt_name: "GENIE 1",
		cell_type: "hiPSC",
		frozen: "True"
	}
]
```

### 2. Generator (`generator` array)

Extract information about the institution that produced/generated the cell line.

| Field | Instructions |
|-------|-------------|
| `group` | Name of the institution that generated the cell line |

**Example:**
```json
generator: [
	{
		group: "Australian Institute for Bioengineering and Nanotechnology"
	}
]
```

### 3. Contact Information (`contact` array)

Retrieve information for the best person to contact regarding the cell line. Always return as an array.

| Field | Instructions |
|-------|-------------|
| `group` | Name of the group that owns/maintains the cell line |
| `first_name` | Contact person's first name |
| `last_name` | Contact person's last name |
| `name_initials` | Contact person's middle initials |
| `e_mail` | Contact person's email address |
| `phone_number` | Contact person's phone number |

**Example:**
```json
contact: [
	{
		group: "Wolvetang-AIBN",
		first_name: "Ernst",
		last_name: "Wolvetang",
		name_initials: "J",
		e_mail: "e.wolvetang@uq.edu.au",
		phone_number: "Missing"
	}
]
```

**Example when no contact information found:**
```json
contact: [
	{
		group: "Missing",
		first_name: "Missing",
		last_name: "Missing",
		name_initials: "Missing",
		e_mail: "Missing",
		phone_number: "Missing"
	}
]
```

### 4. Publications (`publications` array)

Retrieve bibliographic publication metadata from the article. Always return as an array, even if only one publication.

| Field          | Instructions                                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `doi`          | Digital Object Identifier                                                                                                |
| `journal`      | Journal name                                                                                                             |
| `title`        | Full article title                                                                                                       |
| `first_author` | First author name                                                                                                        |
| `last_author`  | Last author name                                                                                                         |
| `year`         | Publication year                                                                                                         |
| `pmid`         | PubMed ID. This often cannot be found in the article however it is the filename stem in the article file you were given. |

**Example:**
```json
publications: [
	{
		doi: "10.1016/j.scr.2021.102564",
		journal: "Stem Cell Research",
		title: "Generation of induced pluripotent stem cell lines from peripheral blood mononuclear cells of three drug resistant and three drug responsive epilepsy patients",
		first_author: "Zoe L. Hunter",
		last_author: "Lata Vadlamudi",
		year: "2021",
		pmid: "34649201"
	}
]
```

### 5. Donor Information (`donor` array)

Extract donor information from the article. Always return as an array.

| Field                 | Instructions                                                                                                                                                                                        | Accepted values                                                                                                                                               |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `age`                 | Age range (see accepted values for how to represent age ranges) of the donor or "Missing" if not found. If the line was embryonically derived, write "EM". If fetus write FE or if neonatal write NEO. | EM, FE, NEO, A1_4, A5_9, A10_14, A15_19, A20_24, A25_29, A30_34, A35_39, A40_44, A45_49, A50_54, A55_59, A60_64, A65_69, A70_74, A75_79, A80_84, A85_89, A89P |
| `sex`                 | Biological sex of the donor or "Missing" if not found                                                                                                                                                  | Male, Female                                                                                                                                                  |
| `disease_name`        | Disease name or "Missing" if not found                                                                                                                                                                 |                                                                                                                                                               |
| `disease_description` | Brief disease description or "Missing" if not found                                                                                                                                                    |                                                                                                                                                               |

**Example:**
```json
donor: [
	{
		age: "35_39",
		sex: "F",
		disease_name: "Epilepsy",
		disease_description: "nan"
	}
]
```

**Example when no donor information found:**
```json
donor: [
	{
		age: "Missing",
		sex: "Missing",
		disease_name: "Missing",
		disease_description: "Missing"
	}
]
```

### 6. Genomic Modifications (`genomic_modifications` array)

Extract genomic modification information from the article. Always return as an array.

| Field             | Instructions                                                                                                                                 | Accepted values                                                           | Example values                                                           |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `mutation_type`   | Type of genomic alteration or "Missing" if not found                                                                                            | Knock in, Knock out, Transgene expression, Variant, Isogenic modification |                                                                          |
| `cytoband`        | Chromosomal location or "Missing" if not found                                                                                                  |                                                                           | 12q24.11, 19q13.2, Xq28                                                  |
| `delivery_method` | How modification was delivered or "Missing" if not found                                                                                        | Crispr/Cas9, Homologous recombination                                     |                                                                          |
| `description`     | Modification description or "Missing" if not found                                                                                              |                                                                           |                                                                          |
| `genotype`        | Write the genotype nomenclature for the genomic modification performed on this cell line, or "NM" if no modification, or "Missing" if not found |                                                                           | Heterozygous: unspecified_reference_TARDBP:c.114, NM_171998.3:c.82_86del |
| `loci_name`       | Write the gene or loci name related to this genomic modificiation or "Missing" if not found                                                     |                                                                           | SCN5A, TPOX, D13S317,GLUCAGON                                            |

**Example:**
```json
genomic_modifications: [
	{
		mutation_type: "Missing",
		cytoband: "Missing",
		delivery_method: "Missing",
		description: "Missing",
		genotype: "Missing",
		loci_name: "Missing"
	}
]
```

### 7. Differentiation Results (`differentiation_results` array)

Extract differentiation testing results from the article.

| Field                     | Instructions                                                          | Accepted Values                                                                                       | Example values                                         |
| ------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `cell_type`               | Cell type abbreviation from results                                   | Ectoderm, Mesoderm, Endoderm                                                                          |                                                        |
| `show_potency`            | Can differentiate into this type                                      | "True", "False"                                                                                       |                                                        |
| `marker_list`             | Differentiation markers as string                                     | Semicolon-separated marker names                                                                      |                                                        |
| `method_used`             | Write the method that was used to determine expression of the markers | See example values. But these are only examples and there could be other methods used in the article. | RT-qPCR, ddPCR, Immunostaining, RT-PCR, Flow cytometry |
| `description` | Select from schema                                                    | In vitro directed differentiation, In vivo teratoma, In vitro spontaneous,                            |                                                        |

**Example:**
```json
differentiation_results: [
	{
		cell_type: "Endoderm",
		show_potency: "True",
		marker_list: "FOXA2; SOX17",
		method_used: "RT-qPCR",
		description: "in vitro directed differentiation"
	},
	{
		cell_type: "Mesodem",
		show_potency: "True",
		marker_list: "HAND1; RUNX1",
		method_used: "RT-qPCR",
		description: "in vitro directed differentiation"
	}
]
```

**Example when no differentiation results found:**
```json
differentiation_results: [
	{
		cell_type: "Missing",
		show_potency: "Missing",
		marker_list: "Missing",
		method_used: "Missing",
		description: "Missing"
	}
]
```

### 8. Undifferentiated Characterisation (`undifferentiated_characterisation` array)

Extract undifferentiated characterisation scores from the article. Always return as an array.

| Field | Instructions |
|-------|-------------|
| `epi_pluri_score` | EpiPluriScore result or "Missing" if not found |
| `pluri_test_score` | PluriTest score or "Missing" if not found |
| `pluri_novelty_score` | PluriTest novelty score or "Missing" if not found |

**Example:**
```json
undifferentiated_characterisation: [
	{
		epi_pluri_score: "Missing",
		pluri_test_score: "Missing",
		pluri_novelty_score: "Missing"
	}
]
```

### 9. Genomic Characterisation (`genomic_characterisation` array)

Extract genomic characterisation information from the article. Always return as an array.

| Field              | Instructions                                                              | Accepted Values                                                                                                                                                                                                                                                                   |
| ------------------ | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `passage_number`   | Passage number from results                                               | Integer                                                                                                                                                                                                                                                                           |
| `karyotype`        | Chromosomal karyotype                                                     | "46,XX", "46,XY", "arr(1-22)x2,(XY)x1", etc.                                                                                                                                                                                                                                      |
| `karyotype_method` | Write the karyotyping method used to perform the genomic characterisation | Ag-NOR banding, C-banding, G-banding, R-banding, Q-banding, T-banding, Spectral karyotyping, Multiplex FISH, CGH, Array CGH, Molecular karyotyping by SNP array, KaryoLite BoBs, Digital karyotyping, Whole genome sequencing, Exome sequencing, Methylation profiling, Other<br> |
| `summary`          | Concise results summary                                                   | Free text                                                                                                                                                                                                                                                                         |

**Example:**
```json
genomic_characterisation: [
	{
		passage_number: "9",
		karyotype: "46,XX",
		karyotype_method: "GB",
		summary: "Karyotyping occurred at a resolution of 300bphs. Fifteen metaphase spreads were analysed."
	}
]
```

**Example when no genomic characterisation found:**
```json
genomic_characterisation: [
	{
		passage_number: "Missing",
		karyotype: "Missing",
		karyotype_method: "Missing",
		summary: "Missing"
	}
]
```

### 10. Induced Derivation (`induced_derivation` array)

For hiPSCs only. Always return as an array.

| Field                       | Instructions                                                                                               | Accepted values                    | Example values |
| --------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------- | -------------- |
| `i_source_cell_type_term`   | Source cell type (e.g., "peripheral blood mononuclear cell", "fibroblasts")                                |                                    |                |
| `i_source_cell_origin_term` | Tissue of origin (e.g., "blood", "skin")                                                                   |                                    |                |
| `derivation_year`           | Year derived                                                                                               |                                    |                |
| `non_int_vector`            | Write the type of the non-integrating vector used for the induced derivation procedure for this cell line. | Episomal, Sendai virus, AAV, Other |                |
| `non_int_vector_name`       | Non-integrating vector name or kit name                                                                    |                                    |                |

**Example:**
```json
induced_derivation: [
	{
		i_source_cell_type_term: "peripheral blood mononuclear cell",
		i_source_cell_origin_term: "blood",
		derivation_year: "2020-01-01",
		non_int_vector: "SV",
		non_int_vector_name: "[kit] CytoTune-iPS 2.0 Sendai reprogramming kit"
	}
]
```

**Example when no induced derivation information found:**
```json
induced_derivation: [
	{
		i_source_cell_type_term: "Missing",
		i_source_cell_origin_term: "Missing",
		derivation_year: "None",
		non_int_vector: "Missing",
		non_int_vector_name: "Missing"
	}
]
```

### 11. Embryonic Derivation (`embryonic_derivation` array)

For ESCs only. Always return as an array.

| Field                            | Instructions                                                                                | Accepted values                                                                   |
| -------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `embryo_stage`                   | Embryo developmental stage or "Missing" if not found                                           | Blastula with ICM and Trophoblast, Cleavage (Mitosis), Compaction, Morula, Zygote |
| `zp_removal_technique`           | Zona pellucida removal method or "Missing" if not found                                        | chemical, enzymatic, manual, mechanical, spontaneous, other                       |
| `trophectoderm_morphology`       | Trophectoderm morphology or "Missing" if not found                                             | type A, type B, type G                                                            |
| `icm_morphology`                 | ICM morphology or "Missing" if not found                                                       | type A, type B, type C, type D, type E                                            |
| `e_preimplant_genetic_diagnosis` | Indicates whether the embryo was created as part of PGD (preimplantation genetic diagnosis) | True, False                                                                       |

**Example:**
```json
embryonic_derivation: [
	{
		embryo_stage: "Missing",
		zp_removal_technique: "Missing",
		trophectoderm_morphology: "Missing",
		icm_morphology: "Missing",
		e_preimplant_genetic_diagnosis: "Missing"
	}
]
```

### 12. Ethics Information (`ethics` array)

Return array of ethics objects (can be multiple):

**Example 1 - Single ethics approval:**
```json
ethics: [
	{
		ethics_number: "1872361",
		approval_date: "21/07/10",
		"institutional_HREC": "University of Queensland Ethics Committee"
	}
]
```

**Example 2 - Multiple ethics approvals:**
```json
ethics: [
	{
		ethics_number: "1872361",
		approval_date: "21/07/10",
		"institutional_HREC": "University of Queensland Ethics Committee"
	},
	{
		ethics_number: "1123JHAJ1",
		approval_date: "18/10/10",
		"institutional_HREC": "Biocells Ethics Committee"
	}
]
```

**Example 3 - No ethics information found:**
```json
ethics: [
	{
		ethics_number: "Missing",
		approval_date: "Missing",
		institutional_HREC: "Missing"
	}
]
```

### 13. Culture Medium (`culture_medium` array)

Extract culture medium information from the article. Always return as an array.

| Field               | Instructions                                           | Accepted values                                                   |
| ------------------- | ------------------------------------------------------ | ----------------------------------------------------------------- |
| `co2_concentration` | CO₂ concentration or "Missing" if not found               | Decimals in the range 0 to 1 e.g. 0.05                            |
| `o2_concentration`  | O₂ concentration or "Missing" if not found                | Decimals in the range 0 to 1 e.g. 0.21                            |
| `passage_method`    | Write the passage method used to culture the cell line | Enzymatically, Enzyme-free cell dissociation, mechanically, other |


If o2 concentration was reported as atmospheric, write 0.21.


**Example:**
```json
culture_medium: [
	{
		co2_concentration: "0.05",
		o2_concentration: "Missing",
		passage_method: "EF"
	}
]
```

**Example when no culture medium information found:**
```json
culture_medium: [
	{
		co2_concentration: "Missing",
		o2_concentration: "Missing",
		passage_method: "Missing"
	}
]
```

## Output Format
Return a single JSON object containing all sections. Use exact field names as specified. Maintain consistent data types (strings, booleans, arrays, objects) as indicated.