from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Dict, Any, Literal
import json
import os
from datetime import datetime
import glob
import shutil
from pathlib import Path

app = FastAPI(title="ASCR Cell Line Archive", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data paths
DATA_PATH = Path(os.getenv("DATA_PATH", "/app/data"))
CELL_LINES_PATH = DATA_PATH / "cell_lines"
VERSIONS_PATH = DATA_PATH / "versions"
WORKING_STORAGE_PATH = Path("cell_line_file_storage/working")
LIVE_STORAGE_PATH = Path("cell_line_file_storage/live")
HISTORICAL_STORAGE_PATH = Path("cell_line_file_storage/historical")

# Ensure directories exist
CELL_LINES_PATH.mkdir(parents=True, exist_ok=True)
VERSIONS_PATH.mkdir(parents=True, exist_ok=True)
WORKING_STORAGE_PATH.mkdir(parents=True, exist_ok=True)
LIVE_STORAGE_PATH.mkdir(parents=True, exist_ok=True)
HISTORICAL_STORAGE_PATH.mkdir(parents=True, exist_ok=True)

# Pydantic models based on existing schema
class Ethics(BaseModel):
    ethics_number: str = ""
    institute: str = ""
    approval_date: str = ""

class CellLineTemplate(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)
    
    # Core identifier
    CellLine_hpscreg_id: str
    
    # Basic CellLine fields
    CellLine_alt_names: List[str] = []
    CellLine_cell_line_type: str = ""
    CellLine_source_cell_type: str = ""
    CellLine_source_tissue: str = ""
    CellLine_source: str = ""
    CellLine_frozen: bool = False
    
    # Publication fields
    CellLine_publication_doi: str = ""
    CellLine_publication_pmid: str = ""
    CellLine_publication_title: str = ""
    CellLine_publication_first_author: str = ""
    CellLine_publication_last_author: str = ""
    CellLine_publication_journal: str = ""
    CellLine_publication_year: Optional[int] = None
    
    # Donor fields
    CellLine_donor_age: str = ""
    CellLine_donor_sex: str = ""
    CellLine_donor_disease: str = ""
    
    # Contact fields
    CellLine_contact_name: str = ""
    CellLine_contact_email: str = ""
    CellLine_contact_phone: str = ""
    CellLine_maintainer: str = ""
    CellLine_producer: str = ""
    
    # Genomic Alteration fields
    GenomicAlteration_performed: bool = False
    GenomicAlteration_mutation_type: str = ""
    GenomicAlteration_cytoband: str = ""
    GenomicAlteration_delivery_method: str = ""
    GenomicAlteration_loci_name: str = ""
    GenomicAlteration_loci_chromosome: str = ""
    GenomicAlteration_loci_start: Optional[int] = None
    GenomicAlteration_loci_end: Optional[int] = None
    GenomicAlteration_loci_group: str = ""
    GenomicAlteration_loci_disease: str = ""
    GenomicAlteration_description: str = ""
    GenomicAlteration_genotype: str = ""
    
    # Simple list for ethics instead of complex nested model
    Ethics: List[Dict[str, str]] = []
    
    # Metadata
    curation_source: str = "manual"
    work_status: str = "in progress"
    created_on: Optional[datetime] = None
    modified_on: Optional[datetime] = None

class CellLineVersion(BaseModel):
    version_number: int
    metadata: Dict[str, Any]
    created_by: str = "system"
    created_on: datetime
    change_summary: str = ""

class CuratedCellLineData(BaseModel):
    """Model for curated cell line data from AI curation"""
    model_config = ConfigDict(extra='allow')  # Allow any additional fields
    
    # This will accept the full curation structure with all arrays
    # No specific field definitions needed - just accept whatever comes from curation

class CellLineSearchResult(BaseModel):
    """Model for cell line search results"""
    cell_line_id: str
    status: Literal["working", "live", "historical"]
    saved_on: Optional[str] = None
    modified_on: Optional[str] = None
    file_name: str
    basic_info: Optional[Dict[str, Any]] = None  # Basic cell line info for preview

# Helper functions
def get_cell_line_path(hpscreg_id: str) -> Path:
    return CELL_LINES_PATH / f"{hpscreg_id}.json"

def get_versions_path(hpscreg_id: str) -> Path:
    versions_dir = VERSIONS_PATH / hpscreg_id
    versions_dir.mkdir(exist_ok=True)
    return versions_dir

def load_cell_line(hpscreg_id: str) -> Optional[CellLineTemplate]:
    file_path = get_cell_line_path(hpscreg_id)
    if not file_path.exists():
        return None
    
    with open(file_path, 'r') as f:
        data = json.load(f)
        return CellLineTemplate(**data)

def save_cell_line(cell_line: CellLineTemplate) -> None:
    file_path = get_cell_line_path(cell_line.CellLine_hpscreg_id)
    
    # Update timestamps
    now = datetime.now()
    if cell_line.created_on is None:
        cell_line.created_on = now
    cell_line.modified_on = now
    
    with open(file_path, 'w') as f:
        json.dump(cell_line.model_dump(), f, indent=2, default=str)

def create_version(cell_line: CellLineTemplate, change_summary: str = "", created_by: str = "system") -> CellLineVersion:
    versions_dir = get_versions_path(cell_line.CellLine_hpscreg_id)
    
    # Get next version number
    existing_versions = list(versions_dir.glob("v*.json"))
    next_version = len(existing_versions) + 1
    
    version = CellLineVersion(
        version_number=next_version,
        metadata=cell_line.model_dump(),
        created_by=created_by,
        created_on=datetime.now(),
        change_summary=change_summary
    )
    
    # Save version
    version_file = versions_dir / f"v{next_version}.json"
    with open(version_file, 'w') as f:
        json.dump(version.model_dump(), f, indent=2, default=str)
    
    # Cleanup old versions (keep last 10)
    if len(existing_versions) >= 10:
        oldest_versions = sorted(existing_versions)[:-9]  # Keep 9, delete rest
        for old_version in oldest_versions:
            old_version.unlink()
    
    return version

def get_cell_lines_from_storage(storage_path: Path, status: str, search_term: Optional[str] = None) -> List[CellLineSearchResult]:
    """Get cell lines from a specific storage directory"""
    files = list(storage_path.glob("*.json"))
    results = []
    
    for file_path in files:
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
            
            # Extract cell line ID
            cell_line_id = data.get("cell_line_id") or file_path.stem
            
            # Apply search filter
            if search_term and search_term.lower() not in cell_line_id.lower():
                continue
            
            # Extract basic info for preview
            basic_info = {}
            curated_data = data.get("curated_data", {})
            if curated_data:
                # Try to get some basic info from the curated data
                basic_data_list = curated_data.get("basic_data", [])
                if basic_data_list and len(basic_data_list) > 0:
                    basic_info = basic_data_list[0]
            
            result = CellLineSearchResult(
                cell_line_id=cell_line_id,
                status=status,
                saved_on=data.get("saved_on"),
                modified_on=data.get("modified_on"),
                file_name=file_path.name,
                basic_info=basic_info
            )
            results.append(result)
            
        except Exception as e:
            # Skip corrupted files
            continue
    
    # Sort by cell line ID
    results.sort(key=lambda x: x.cell_line_id)
    return results

# Routes
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "cell_line_archive"}

@app.get("/cell-lines/", response_model=List[CellLineTemplate])
async def list_cell_lines(
    limit: int = Query(100, le=1000),
    offset: int = Query(0, ge=0),
    work_status: Optional[str] = None,
    search: Optional[str] = None
):
    """List all cell lines with optional filtering"""
    cell_line_files = list(CELL_LINES_PATH.glob("*.json"))
    cell_lines = []
    
    for file_path in cell_line_files:
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
                cell_line = CellLineTemplate(**data)
                
                # Apply filters
                if work_status and cell_line.work_status != work_status:
                    continue
                
                if search and search.lower() not in cell_line.CellLine_hpscreg_id.lower():
                    continue
                
                cell_lines.append(cell_line)
        except Exception as e:
            # Skip corrupted files
            continue
    
    # Sort by modified date
    cell_lines.sort(key=lambda x: x.modified_on or datetime.min, reverse=True)
    
    # Apply pagination
    return cell_lines[offset:offset + limit]

@app.get("/cell-lines/{hpscreg_id}", response_model=CellLineTemplate)
async def get_cell_line(hpscreg_id: str):
    """Get a specific cell line"""
    cell_line = load_cell_line(hpscreg_id)
    if not cell_line:
        raise HTTPException(status_code=404, detail="Cell line not found")
    return cell_line

@app.post("/cell-lines/", response_model=CellLineTemplate)
async def create_cell_line(cell_line: CellLineTemplate):
    """Create a new cell line"""
    existing = load_cell_line(cell_line.CellLine_hpscreg_id)
    if existing:
        raise HTTPException(status_code=409, detail="Cell line already exists")
    
    save_cell_line(cell_line)
    create_version(cell_line, "Initial creation", "system")
    
    return cell_line

@app.put("/cell-lines/{hpscreg_id}", response_model=CellLineTemplate)
async def update_cell_line(hpscreg_id: str, cell_line: CellLineTemplate):
    """Update an existing cell line"""
    existing = load_cell_line(hpscreg_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Cell line not found")
    
    # Ensure ID matches
    cell_line.CellLine_hpscreg_id = hpscreg_id
    
    save_cell_line(cell_line)
    create_version(cell_line, "Updated via API", "api")
    
    return cell_line

@app.delete("/cell-lines/{hpscreg_id}")
async def delete_cell_line(hpscreg_id: str):
    """Delete a cell line"""
    file_path = get_cell_line_path(hpscreg_id)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Cell line not found")
    
    # Archive the file instead of deleting
    archive_path = CELL_LINES_PATH / "archived" / f"{hpscreg_id}.json"
    archive_path.parent.mkdir(exist_ok=True)
    shutil.move(str(file_path), str(archive_path))
    
    return {"message": "Cell line archived successfully"}

@app.get("/cell-lines/{hpscreg_id}/versions", response_model=List[CellLineVersion])
async def get_cell_line_versions(hpscreg_id: str):
    """Get version history for a cell line"""
    versions_dir = get_versions_path(hpscreg_id)
    version_files = sorted(versions_dir.glob("v*.json"), reverse=True)
    
    versions = []
    for version_file in version_files:
        with open(version_file, 'r') as f:
            data = json.load(f)
            versions.append(CellLineVersion(**data))
    
    return versions

@app.get("/search/cell-lines")
async def search_cell_lines(
    q: Optional[str] = Query(None, description="Search term for cell line ID"),
    status: Optional[Literal["working", "live", "historical", "all"]] = Query("all", description="Filter by status"),
    limit: int = Query(50, le=200, description="Maximum number of results")
) -> List[CellLineSearchResult]:
    """
    Search for cell lines across all storage types.
    Returns cell lines with their status (working/live/historical).
    """
    results = []
    
    # Search working cell lines
    if status in ["working", "all"]:
        working_results = get_cell_lines_from_storage(WORKING_STORAGE_PATH, "working", q)
        results.extend(working_results)
    
    # Search live cell lines  
    if status in ["live", "all"]:
        live_results = get_cell_lines_from_storage(LIVE_STORAGE_PATH, "live", q)
        results.extend(live_results)
    
    # Search historical cell lines
    if status in ["historical", "all"]:
        historical_results = get_cell_lines_from_storage(HISTORICAL_STORAGE_PATH, "historical", q)
        results.extend(historical_results)
    
    # Sort by status priority (working first, then live, then historical) and cell line ID
    priority_order = {"working": 0, "live": 1, "historical": 2}
    results.sort(key=lambda x: (priority_order.get(x.status, 3), x.cell_line_id))
    
    return results[:limit]

@app.get("/search/working-cell-lines")
async def search_working_cell_lines(
    q: Optional[str] = Query(None, description="Search term for cell line ID"),
    limit: int = Query(50, le=200)
) -> List[CellLineSearchResult]:
    """Search specifically for working cell lines"""
    return get_cell_lines_from_storage(WORKING_STORAGE_PATH, "working", q)[:limit]

@app.get("/search/live-cell-lines") 
async def search_live_cell_lines(
    q: Optional[str] = Query(None, description="Search term for cell line ID"),
    limit: int = Query(50, le=200)
) -> List[CellLineSearchResult]:
    """Search specifically for live cell lines"""
    return get_cell_lines_from_storage(LIVE_STORAGE_PATH, "live", q)[:limit]

@app.get("/search/historical-cell-lines")
async def search_historical_cell_lines(
    q: Optional[str] = Query(None, description="Search term for cell line ID"),
    limit: int = Query(50, le=200)
) -> List[CellLineSearchResult]:
    """Search specifically for historical cell lines"""
    return get_cell_lines_from_storage(HISTORICAL_STORAGE_PATH, "historical", q)[:limit]

@app.post("/curated-cell-lines/{cell_line_id}")
async def save_curated_cell_line(cell_line_id: str, cell_line_data: Dict[str, Any]):
    """
    Save curated cell line data to working storage.
    This creates a digital cell line metadata profile for database ingestion.
    """
    try:
        # Sanitize the cell line ID for filename
        safe_filename = "".join(c for c in cell_line_id if c.isalnum() or c in ('-', '_')).strip()
        if not safe_filename:
            raise HTTPException(status_code=400, detail="Invalid cell line ID for filename")
        
        # Create the file path
        file_path = WORKING_STORAGE_PATH / f"{safe_filename}.json"
        
        # Add metadata
        output_data = {
            "cell_line_id": cell_line_id,
            "saved_on": datetime.now().isoformat(),
            "status": "working",
            "curated_data": cell_line_data
        }
        
        # Save to file
        with open(file_path, 'w') as f:
            json.dump(output_data, f, indent=2, default=str)
        
        return {
            "message": "Cell line saved successfully",
            "cell_line_id": cell_line_id,
            "file_path": str(file_path),
            "status": "working"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save cell line: {str(e)}")

@app.get("/curated-cell-lines/{cell_line_id}")
async def get_curated_cell_line(cell_line_id: str):
    """Get a curated cell line from working storage"""
    safe_filename = "".join(c for c in cell_line_id if c.isalnum() or c in ('-', '_')).strip()
    file_path = WORKING_STORAGE_PATH / f"{safe_filename}.json"
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Curated cell line not found")
    
    with open(file_path, 'r') as f:
        data = json.load(f)
    
    return data

@app.get("/curated-cell-lines/")
async def list_curated_cell_lines():
    """List all curated cell lines in working storage"""
    files = list(WORKING_STORAGE_PATH.glob("*.json"))
    cell_lines = []
    
    for file_path in files:
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
                cell_lines.append({
                    "cell_line_id": data.get("cell_line_id"),
                    "status": data.get("status"),
                    "saved_on": data.get("saved_on"),
                    "file_name": file_path.name
                })
        except:
            continue
    
    return {"curated_cell_lines": cell_lines}

@app.get("/stats")
async def get_stats():
    """Get archive statistics"""
    cell_line_files = list(CELL_LINES_PATH.glob("*.json"))
    total_cell_lines = len(cell_line_files)
    
    # Count curated cell lines in working storage
    curated_files = list(WORKING_STORAGE_PATH.glob("*.json"))
    total_curated = len(curated_files)
    
    # Count by work status
    status_counts = {}
    for file_path in cell_line_files:
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
                status = data.get("work_status", "unknown")
                status_counts[status] = status_counts.get(status, 0) + 1
        except:
            continue
    
    return {
        "total_cell_lines": total_cell_lines,
        "total_curated_working": total_curated,
        "status_breakdown": status_counts,
        "last_updated": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)