

# Design of ASCR Admin Portal System

This document defines all the features and interactions of the ASCR Admin Portal system.

- The application is a containerised application
- Frontend: Next.js
- Backend: FastAPI, Taskflow,
- Package manager: uv

The portal is responsible for several aspects of the data lifecycle in relation to curating cell line metadata from the stem cell literature.

- Creation of new cell lines
- Validation of new cell lines
- Ontology alignment
- Comparison of cell lines
- Version history
- Editing current / working cell lines
- Automated cell line creation

The portal passes on reviewed cell lines into the registry application. These reviewed cell lines are validated and, in principle, are ready for direct ingestion into the registry database.

The registry database only hosts current, registered or embargoed cell lines. All version history is maintained by the portal system. Version review and restoration can be performed by the admin portal system.

## AI Curation 

The AI curation feature uses scripts developed as a part of Stefan Miranda's research project.

- The research project developed a pipeline that consisted of AI curation, results processing and semantic scoring. Score reports were generated that gave evidence on the performance of gpt AI models on the range of metadata fields curated.
- Not ever ASCR metadata field was curated, scored and reported in the project.

In this admin portal system, the prototype AI curation scripts are taken and extended to include all fields necessary for the ASCR.

The instructions for AI curation are based on manually created instructions for each metadata field. These are tailored to the ASCR. 



## Orchestration and Pipelines

**Tool**: Airflow, Taskflow API

Orchestration and pipelines are written using Apache Airflow's Taskflow API. Individual pipelines and task scripts are described in relevant sections in this document.



## Validation 

When the curator saves a new cell line a series of validation steps must happen to confirm the new cell line against the constraints defined in the **data dictionary**. These validation steps are written in `validation.py` . The validation pipeline is written in `validation_pipeline.py`. 

Recommendations for validation 

- Each new validation should be created as a separate function with an `@task()` decorator.
- Each validation task should then be put into the validation pipeline.
- Every validation task needs to be documented. 

The entire validation pipeline is run every time curator saves a cell line they are working on.





## Comparison script

A comparison script is defined to compare cell lines.

File: `comparison.py`

Use cases: 

- Comparison of new AI curated cell lines against real entries in the registry.
  - Identification of discrepancies between registered cell lines and new curated cell lines.
  - Is there a mistake in the registry, or is there a mistake in the new curated metadata?



- Comparison of different *versions* of cell lines, to check how versions differ and roll back.

The comparison script performs *exact string matching* between identifcal fields. The script must generate a JSON file that indicates for every field whether an exact match occured, and if there was a discrepancy, what the two values are. Users can then see where discrepancies exist between two cell lines and decide how to treat these discrepancies. 

The comparison script first runs validation that the cell lines are aligned with the schema, then performs exact string matching, then returns its comparison JSON string





### Ontology integration

The problem 

- Several fields in the ASCR are according to an ontology
- New cells lines can come from hPSCreg, automated curation or manual curation 
  - There are no guarantees that entries in these fields are ontology terms 
  - How do we restrain values in these fields to ontology terms? 



Solution 1 

- Store local copies of the ontologies
- Build a search and align layer on top of the ontologies 
- Build a script that uses the search and align layer to align the fields.





Should this script be run everytime curator hits save or everytime curator hits publish?

- The consideration is time. How long does the script take to run? 
- If it's more than a second, maybe we don't want to have this for working copies of cell lines. Maybe we just want to have this for publishing a cell line from working to reviewed.



Also need to consider what happens if a field entry cannot be mapped onto one of our ontologies. Need to alert curator that could not map. 















