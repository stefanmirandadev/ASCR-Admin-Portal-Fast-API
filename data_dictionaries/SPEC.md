# Data Dictionary Pipeline Specification

## Overview

Automated pipeline to convert the ASCR data dictionary (xlsx) into curation-ready artifacts for the AI curation workflow.

## Pipeline Flow

```
xlsx (full data dictionary)
    ↓ filter key='None' only (real fields, exclude PK/FK)
    ↓
YAML (source of truth for curation)
    ↓
Pydantic Models (generated from YAML)
    ↓
JSON Schema (auto-generated from pydantic)
```

## Input

- **File:** `2025_12_ascr_data_dictionary_v1.0.xlsx`
- **Sheet:** `data_dictionary`
- **Filter:** Only rows where `key = 'None'` (excludes PK and FK fields)

## Output Files

All outputs written to `data_dictionaries/`:

| File | Purpose |
|------|---------|
| `curation_schema.yaml` | Human-readable source of truth for curation fields |
| `curation_models.py` | Generated pydantic models with validators |
| `curation_schema.jsoncc` | JSON schema for frontend form rendering (with comments) |

## YAML Structure

```yaml
CellLine:
  fields:
    hpscreg_name:
      description: "Cell line name in hPSCreg."
      data_type: VARCHAR
      allows_null: true
      field_length: 100
      valid_values_long: null
      uses_ontology: false
      llm_curate: true
      llm_instructions: "Write the name of the cell line..."

    cell_type:
      description: "Type of cell line."
      data_type: ENUM
      allows_null: false
      field_length: 5
      valid_values_long:
        - "human embryonic stem cell (hESC)"
        - "human induced pluripotent stem cell (hiPSC)"
      uses_ontology: false
      llm_curate: true
      llm_instructions: "Select from schema literals..."

AnotherModel:
  fields:
    ...
```

## Pydantic Model Generation

### Type Mapping

| data_type | Python Type |
|-----------|-------------|
| VARCHAR | `str` |
| TEXT | `str` |
| INT | `int` |
| FLOAT | `float` |
| BOOLEAN | `bool` |
| DATE | `datetime.date` |
| DATETIME | `datetime.datetime` |
| ENUM | `Literal["val1", "val2", ...]` |

### Nullability

- `allows_null = 'Yes'` → `Optional[type] = None`
- `allows_null = 'No'` → `type` (required)

### Field Constraints

- `field_length` → `Field(max_length=N)` for string types
- `valid_values_long` → `Literal[...]` type hint for ENUMs

### Generated Model Example

```python
from typing import Optional, Literal
from pydantic import BaseModel, Field
from datetime import date

class CellLine(BaseModel):
    hpscreg_name: Optional[str] = Field(default=None, max_length=100)
    cell_type: Literal[
        "human embryonic stem cell (hESC)",
        "human induced pluripotent stem cell (hiPSC)"
    ]
    # ... more fields
```

## JSON Schema

Auto-generated from pydantic models using `model.model_json_schema()`.

Used by frontend for:
- Form field rendering
- Client-side validation hints
- Field type information

## Script Interface

```bash
# Run the pipeline
source .venv/bin/activate
python data_dictionaries/make_data_dictionary.py

# Optional: specify input file
python data_dictionaries/make_data_dictionary.py --input other_dictionary.xlsx
```

---

## Test Cases

### 1. YAML Generation Tests

#### 1.1 Filter PK/FK fields
```python
def test_yaml_excludes_pk_fields():
    """YAML output should not contain any fields where key='PK'"""
    yaml_data = load_generated_yaml()
    for model_name, model_def in yaml_data.items():
        for field_name, field_def in model_def['fields'].items():
            # No field should be a PK (they're filtered out)
            assert field_name != 'id'  # common PK name
```

#### 1.2 Filter FK fields
```python
def test_yaml_excludes_fk_fields():
    """YAML output should not contain any fields where key='FK'"""
    # FK fields typically end with '_id' and reference other tables
    yaml_data = load_generated_yaml()
    # Verify known FK fields from xlsx are not present
```

#### 1.3 All models present
```python
def test_yaml_contains_all_models():
    """YAML should contain all django_class_name values from xlsx"""
    yaml_data = load_generated_yaml()
    expected_models = get_unique_class_names_from_xlsx()
    assert set(yaml_data.keys()) == expected_models
```

#### 1.4 Field metadata preserved
```python
def test_yaml_field_metadata_complete():
    """Each field should have all required metadata keys"""
    required_keys = [
        'description', 'data_type', 'allows_null', 'field_length',
        'valid_values_long', 'uses_ontology', 'llm_curate', 'llm_instructions'
    ]
    yaml_data = load_generated_yaml()
    for model_name, model_def in yaml_data.items():
        for field_name, field_def in model_def['fields'].items():
            for key in required_keys:
                assert key in field_def, f"Missing {key} in {model_name}.{field_name}"
```

#### 1.5 Enum values parsed correctly
```python
def test_yaml_enum_values_parsed_as_list():
    """valid_values_long should be parsed into a list for ENUM fields"""
    yaml_data = load_generated_yaml()
    cell_line = yaml_data['CellLine']['fields']
    cell_type = cell_line['cell_type']
    assert isinstance(cell_type['valid_values_long'], list)
    assert "human embryonic stem cell (hESC)" in cell_type['valid_values_long']
```

### 2. Pydantic Model Generation Tests

#### 2.1 Models are valid pydantic
```python
def test_generated_models_importable():
    """Generated curation_models.py should be importable without errors"""
    from data_dictionaries import curation_models
    assert hasattr(curation_models, 'CellLine')
```

#### 2.2 Type mapping correct
```python
def test_varchar_maps_to_str():
    """VARCHAR fields should be typed as str"""
    from data_dictionaries.curation_models import CellLine
    hints = get_type_hints(CellLine)
    # hpscreg_name is VARCHAR
    assert hints['hpscreg_name'] == Optional[str]
```

#### 2.3 Nullable fields are Optional
```python
def test_nullable_fields_are_optional():
    """Fields with allows_null=Yes should be Optional with default None"""
    from data_dictionaries.curation_models import CellLine
    # Check field default is None for nullable fields
    assert CellLine.model_fields['hpscreg_name'].default is None
```

#### 2.4 Required fields have no default
```python
def test_required_fields_no_default():
    """Fields with allows_null=No should be required (no default)"""
    from data_dictionaries.curation_models import CellLine
    # cell_type is required (allows_null=No)
    field = CellLine.model_fields['cell_type']
    assert field.is_required()
```

#### 2.5 Field length constraint applied
```python
def test_field_length_constraint():
    """String fields should have max_length constraint from field_length"""
    from data_dictionaries.curation_models import CellLine
    field = CellLine.model_fields['hpscreg_name']
    assert field.metadata  # has constraints
    # max_length=100 for hpscreg_name
```

#### 2.6 Enum validation works
```python
def test_enum_field_validation():
    """ENUM fields should reject invalid values"""
    from data_dictionaries.curation_models import CellLine
    from pydantic import ValidationError

    # Valid value should work
    valid = CellLine(cell_type="human embryonic stem cell (hESC)", ...)

    # Invalid value should raise
    with pytest.raises(ValidationError):
        CellLine(cell_type="invalid_type", ...)
```

### 3. JSON Schema Generation Tests

#### 3.1 Valid JSON
```python
def test_json_schema_is_valid_json():
    """curation_schema.jsonc should be valid JSON"""
    import json
    with open('data_dictionaries/curation_schema.jsonc') as f:
        schema = json.load(f)
    assert isinstance(schema, dict)
```

#### 3.2 Contains all models
```python
def test_json_schema_contains_all_models():
    """JSON schema should have definitions for all models"""
    schema = load_json_schema()
    assert 'CellLine' in schema.get('$defs', {})
```

#### 3.3 Enum values in schema
```python
def test_json_schema_enum_values():
    """ENUM fields should have enum values in JSON schema"""
    schema = load_json_schema()
    cell_type_schema = schema['$defs']['CellLine']['properties']['cell_type']
    assert 'enum' in cell_type_schema or 'anyOf' in cell_type_schema
```

### Test Helpers

```python
import yaml
import json
import subprocess
from pathlib import Path
from openpyxl import load_workbook

def load_generated_yaml():
    """Load the generated YAML schema file."""
    with open('data_dictionaries/curation_schema.yaml') as f:
        return yaml.safe_load(f)

def load_json_schema():
    """Load the generated JSONC schema file (skips comment lines)."""
    with open('data_dictionaries/curation_schema.jsonc') as f:
        lines = [line for line in f if not line.strip().startswith('//')]
        return json.loads(''.join(lines))

def run_pipeline():
    """Execute the data dictionary pipeline."""
    subprocess.run(
        ['python', 'data_dictionaries/make_data_dictionary.py'],
        check=True
    )

def get_unique_class_names_from_xlsx():
    """Extract all unique django_class_name values from source xlsx."""
    wb = load_workbook('data_dictionaries/2025_12_ascr_data_dictionary_v1.0.xlsx')
    ws = wb['data_dictionary']
    class_names = set()
    for row in ws.iter_rows(min_row=2, values_only=True):
        if row[0] and row[5] == 'None':  # django_class_name, key='None'
            class_names.add(row[0])
    return class_names
```

### 4. End-to-End Tests

#### 4.1 Full pipeline runs without error
```python
def test_pipeline_runs_successfully():
    """Running make_data_dictionary.py should complete without errors"""
    result = subprocess.run(
        ['python', 'data_dictionaries/make_data_dictionary.py'],
        capture_output=True
    )
    assert result.returncode == 0
```

#### 4.2 All output files created
```python
def test_all_output_files_created():
    """Pipeline should create all three output files"""
    run_pipeline()
    assert Path('data_dictionaries/curation_schema.yaml').exists()
    assert Path('data_dictionaries/curation_models.py').exists()
    assert Path('data_dictionaries/curation_schema.jsonc').exists()
```

#### 4.3 Roundtrip validation
```python
def test_sample_cell_line_validates():
    """A sample CellLine JSON should validate against generated model"""
    from data_dictionaries.curation_models import CellLine

    sample = {
        "hpscreg_name": "Genea019",
        "cell_type": "human induced pluripotent stem cell (hiPSC)",
        # ... other required fields
    }
    cell_line = CellLine(**sample)
    assert cell_line.hpscreg_name == "Genea019"
```
