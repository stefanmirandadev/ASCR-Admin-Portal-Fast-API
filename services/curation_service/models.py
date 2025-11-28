from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Any, Dict
from enum import Enum

class AgeRange(str, Enum):
    """Accepted age range values"""
    EM = "EM"  # Embryonic
    FE = "FE"  # Fetal
    NEO = "NEO"  # Neonatal
    A1_4 = "A1_4"
    A5_9 = "A5_9"
    A10_14 = "A10_14"
    A15_19 = "A15_19"
    A20_24 = "A20_24"
    A25_29 = "A25_29"
    A30_34 = "A30_34"
    A35_39 = "A35_39"
    A40_44 = "A40_44"
    A45_49 = "A45_49"
    A50_54 = "A50_54"
    A55_59 = "A55_59"
    A60_64 = "A60_64"
    A65_69 = "A65_69"
    A70_74 = "A70_74"
    A75_79 = "A75_79"
    A80_84 = "A80_84"
    A85_89 = "A85_89"
    A89P = "A89P"

class Sex(str, Enum):
    """Biological sex options"""
    MALE = "Male"
    FEMALE = "Female"

class CellType(str, Enum):
    """Cell type options"""
    HIPSC = "hiPSC"
    ESC = "ESC"

class MutationType(str, Enum):
    """Mutation type options"""
    KNOCK_IN = "Knock in"
    KNOCK_OUT = "Knock out"
    TRANSGENE_EXPRESSION = "Transgene expression"
    VARIANT = "Variant"
    ISOGENIC_MODIFICATION = "Isogenic modification"

class DeliveryMethod(str, Enum):
    """Delivery method options"""
    CRISPR_CAS9 = "Crispr/Cas9"
    HOMOLOGOUS_RECOMBINATION = "Homologous recombination"

class GermLayerType(str, Enum):
    """Germ layer types"""
    ECTODERM = "Ectoderm"
    MESODERM = "Mesoderm"
    ENDODERM = "Endoderm"

class DifferentiationDescription(str, Enum):
    """Differentiation description options"""
    IN_VITRO_DIRECTED = "In vitro directed differentiation"
    IN_VIVO_TERATOMA = "In vivo teratoma"
    IN_VITRO_SPONTANEOUS = "In vitro spontaneous"

class NonIntegratingVector(str, Enum):
    """Non-integrating vector types"""
    EPISOMAL = "Episomal"
    SENDAI_VIRUS = "Sendai virus"
    AAV = "AAV"
    OTHER = "Other"

class EmbryoStage(str, Enum):
    """Embryo developmental stages"""
    BLASTULA_ICM_TROPHOBLAST = "Blastula with ICM and Trophoblast"
    CLEAVAGE_MITOSIS = "Cleavage (Mitosis)"
    COMPACTION = "Compaction"
    MORULA = "Morula"
    ZYGOTE = "Zygote"

class ZpRemovalTechnique(str, Enum):
    """Zona pellucida removal techniques"""
    CHEMICAL = "chemical"
    ENZYMATIC = "enzymatic"
    MANUAL = "manual"
    MECHANICAL = "mechanical"
    SPONTANEOUS = "spontaneous"
    OTHER = "other"

class TrophectodermMorphology(str, Enum):
    """Trophectoderm morphology types"""
    TYPE_A = "type A"
    TYPE_B = "type B"
    TYPE_G = "type G"

class IcmMorphology(str, Enum):
    """ICM morphology types"""
    TYPE_A = "type A"
    TYPE_B = "type B"
    TYPE_C = "type C"
    TYPE_D = "type D"
    TYPE_E = "type E"

class KaryotypeMethod(str, Enum):
    """Karyotyping methods"""
    AG_NOR_BANDING = "Ag-NOR banding"
    C_BANDING = "C-banding"
    G_BANDING = "G-banding"
    R_BANDING = "R-banding"
    Q_BANDING = "Q-banding"
    T_BANDING = "T-banding"
    SPECTRAL_KARYOTYPING = "Spectral karyotyping"
    MULTIPLEX_FISH = "Multiplex FISH"
    CGH = "CGH"
    ARRAY_CGH = "Array CGH"
    MOLECULAR_KARYOTYPING_SNP = "Molecular karyotyping by SNP array"
    KARYOLITE_BOBS = "KaryoLite BoBs"
    DIGITAL_KARYOTYPING = "Digital karyotyping"
    WHOLE_GENOME_SEQUENCING = "Whole genome sequencing"
    EXOME_SEQUENCING = "Exome sequencing"
    METHYLATION_PROFILING = "Methylation profiling"
    OTHER = "Other"

class PassageMethod(str, Enum):
    """Passage methods"""
    ENZYMATICALLY = "Enzymatically"
    ENZYME_FREE = "Enzyme-free cell dissociation"
    MECHANICALLY = "mechanically"
    OTHER = "other"

# Core data models
class BasicData(BaseModel):
    hpscreg_name: str = Field(description="Name of the cell line being curated")
    cell_line_alt_name: str = Field(default="Missing", description="Alternative names for the cell line")
    cell_type: str = Field(description="Cell type (hiPSC, ESC, etc.)")
    frozen: str = Field(description="True if stocked/archived date mentioned, False otherwise")

class Generator(BaseModel):
    group: str = Field(default="Missing", description="Institution that generated the cell line")

class Contact(BaseModel):
    group: str = Field(default="Missing", description="Group that owns/maintains the cell line")
    first_name: str = Field(default="Missing", description="Contact person's first name")
    last_name: str = Field(default="Missing", description="Contact person's last name")
    name_initials: str = Field(default="Missing", description="Contact person's middle initials")
    e_mail: str = Field(default="Missing", description="Contact person's email address")
    phone_number: str = Field(default="Missing", description="Contact person's phone number")

class Publications(BaseModel):
    doi: str = Field(default="Missing", description="Digital Object Identifier")
    journal: str = Field(default="Missing", description="Journal name")
    title: str = Field(default="Missing", description="Full article title")
    first_author: str = Field(default="Missing", description="First author name")
    last_author: str = Field(default="Missing", description="Last author name")
    year: str = Field(default="Missing", description="Publication year")
    pmid: str = Field(default="Missing", description="PubMed ID")

class Donor(BaseModel):
    age: str = Field(default="Missing", description="Age range of the donor")
    sex: str = Field(default="Missing", description="Biological sex of the donor")
    disease_name: str = Field(default="Missing", description="Disease name")
    disease_description: str = Field(default="Missing", description="Brief disease description")

class GenomicModifications(BaseModel):
    mutation_type: str = Field(default="Missing", description="Type of genomic alteration")
    cytoband: str = Field(default="Missing", description="Chromosomal location")
    delivery_method: str = Field(default="Missing", description="How modification was delivered")
    description: str = Field(default="Missing", description="Modification description")
    genotype: str = Field(default="Missing", description="Genotype nomenclature for the genomic modification")
    loci_name: str = Field(default="Missing", description="Gene or loci name related to this genomic modification")

class DifferentiationResults(BaseModel):
    cell_type: str = Field(default="Missing", description="Cell type abbreviation from results")
    show_potency: str = Field(default="Missing", description="Can differentiate into this type")
    marker_list: str = Field(default="Missing", description="Differentiation markers as semicolon-separated string")
    method_used: str = Field(default="Missing", description="Method used to determine expression of markers")
    description: str = Field(default="Missing", description="Type of differentiation test")

class UndifferentiatedCharacterisation(BaseModel):
    epi_pluri_score: str = Field(default="Missing", description="EpiPluriScore result")
    pluri_test_score: str = Field(default="Missing", description="PluriTest score")
    pluri_novelty_score: str = Field(default="Missing", description="PluriTest novelty score")

class GenomicCharacterisation(BaseModel):
    passage_number: str = Field(default="Missing", description="Passage number from results")
    karyotype: str = Field(default="Missing", description="Chromosomal karyotype")
    karyotype_method: str = Field(default="Missing", description="Karyotyping method used")
    summary: str = Field(default="Missing", description="Concise results summary")

class InducedDerivation(BaseModel):
    i_source_cell_type_term: str = Field(default="Missing", description="Source cell type")
    i_source_cell_origin_term: str = Field(default="Missing", description="Tissue of origin")
    derivation_year: str = Field(default="Missing", description="Year derived")
    non_int_vector: str = Field(default="Missing", description="Type of non-integrating vector used")
    non_int_vector_name: str = Field(default="Missing", description="Non-integrating vector name or kit name")

class EmbryonicDerivation(BaseModel):
    embryo_stage: str = Field(default="Missing", description="Embryo developmental stage")
    zp_removal_technique: str = Field(default="Missing", description="Zona pellucida removal method")
    trophectoderm_morphology: str = Field(default="Missing", description="Trophectoderm morphology")
    icm_morphology: str = Field(default="Missing", description="ICM morphology")
    e_preimplant_genetic_diagnosis: str = Field(default="Missing", description="Whether embryo was created as part of PGD")

class Ethics(BaseModel):
    ethics_number: str = Field(default="Missing", description="Ethics approval number")
    approval_date: str = Field(default="Missing", description="Ethics approval date")
    institutional_HREC: str = Field(default="Missing", description="Institutional HREC name")

class CultureMedium(BaseModel):
    co2_concentration: str = Field(default="Missing", description="CO₂ concentration")
    o2_concentration: str = Field(default="Missing", description="O₂ concentration")
    passage_method: str = Field(default="Missing", description="Passage method used to culture the cell line")

# Complete cell line data structure
class CellLineMetadataModel(BaseModel):
    basic_data: List[BasicData] = Field(default_factory=lambda: [BasicData()])
    generator: List[Generator] = Field(default_factory=lambda: [Generator()])
    contact: List[Contact] = Field(default_factory=lambda: [Contact()])
    publications: List[Publications] = Field(default_factory=lambda: [Publications()])
    donor: List[Donor] = Field(default_factory=lambda: [Donor()])
    genomic_modifications: List[GenomicModifications] = Field(default_factory=lambda: [GenomicModifications()])
    differentiation_results: List[DifferentiationResults] = Field(default_factory=lambda: [DifferentiationResults()])
    undifferentiated_characterisation: List[UndifferentiatedCharacterisation] = Field(default_factory=lambda: [UndifferentiatedCharacterisation()])
    genomic_characterisation: List[GenomicCharacterisation] = Field(default_factory=lambda: [GenomicCharacterisation()])
    induced_derivation: List[InducedDerivation] = Field(default_factory=lambda: [InducedDerivation()])
    embryonic_derivation: List[EmbryonicDerivation] = Field(default_factory=lambda: [EmbryonicDerivation()])
    ethics: List[Ethics] = Field(default_factory=lambda: [Ethics()])
    culture_medium: List[CultureMedium] = Field(default_factory=lambda: [CultureMedium()])

# Usage metadata models
class UsageData(BaseModel):
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    curation_time_seconds: float
    raw_response: Optional[Dict[str, Any]] = None
    error_response: Optional[Dict[str, Any]] = None

class IdentificationUsage(BaseModel):
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    identification_time_seconds: float
    raw_response: Optional[Dict[str, Any]] = None
    error_response: Optional[Dict[str, Any]] = None

class UsageMetadata(BaseModel):
    identification_usage: Optional[IdentificationUsage] = None
    curation_usage: Optional[List[UsageData]] = None
    error_response: Optional[Dict[str, Any]] = None

# Complete curation response
class CurationResponse(BaseModel):
    status: Literal["success", "error"]
    message: str
    filename: str
    file_size_kb: float
    cell_lines_found: Optional[int] = None
    successful_curations: Optional[int] = None
    failed_cell_lines: Optional[List[str]] = None
    curated_data: Optional[Dict[str, CellLineData]] = None
    usage_metadata: Optional[UsageMetadata] = None
    error: Optional[str] = None