import openai
import json
import os
import time
from datetime import datetime
from typing import List, Dict, Any, Tuple
import asyncio
import io
from dataclasses import dataclass
from openai import AsyncOpenAI
from pdf2image import convert_from_bytes
import logging
import base64
from pydantic import BaseModel, ValidationError
from agents import Agent, trace, Runner
from data_dictionaries.curation_models import CellLineCurationForm
from config_manager import config_manager

logger = logging.getLogger(__name__)

@dataclass
class VocabularyContext:
    controlled_vocabularies: Dict[str, Any]

@dataclass
class PDFInfo:
    file_id: str
    filename: str
    client: AsyncOpenAI

def load_controlled_vocabulary() -> VocabularyContext:
    """Load the controlled vocabulary from the ASCR ontology file"""
    ontology_path = "/app/contexts/ASCR_ONTOLOGY.json"
    
    # Try local path if Docker path doesn't exist
    if not os.path.exists(ontology_path):
        ontology_path = "services/curation_service/contexts/ASCR_ONTOLOGY.json"
    
    try:
        with open(ontology_path, 'r') as f:
            ontology_data = json.loads(f.read())
        return VocabularyContext(controlled_vocabularies=ontology_data["controlled_vocabularies"])
    except (FileNotFoundError, KeyError, json.JSONDecodeError) as e:
        print(f"Warning: Could not load controlled vocabulary: {e}")
        return VocabularyContext(controlled_vocabularies={})

async def validate_and_upload_pdf(filename: str, file_data: bytes) -> PDFInfo:
    """
    Validate PDF file and upload to OpenAI Files API.
    
    Args:
        filename: Name of the uploaded PDF file
        file_data: PDF bytes
        
    Returns:
        PDFInfo containing file_id, filename, and client
    """
    logger.info(f"Validating file: {filename}")
    
    # Validate PDF file
    if not filename.endswith(".pdf"):
        error_msg = "File must be a PDF, please try again."
        logger.error(f"Validation failed: {error_msg}")
        raise ValueError(error_msg)
    
    # Initialize OpenAI client with API key from config
    api_key = config_manager.get("OPENAI_API_KEY")
    if not api_key or api_key == "your_openai_api_key_here":
        raise ValueError("OpenAI API key not set. Please set it in Settings.")

    # Log masked API key for debugging
    masked_key = f"***{api_key[-4:]}" if api_key and len(api_key) > 4 else "***"
    logger.info(f"Using OpenAI API key ending with: {masked_key}")

    client = AsyncOpenAI(api_key=api_key)
    
    # Upload PDF file to OpenAI Files API
    logger.info(f"Uploading PDF file {filename} to OpenAI Files API...")
    file_obj = io.BytesIO(file_data)
    file_obj.name = filename
    
    pdf = await client.files.create(
        file=file_obj,
        purpose="user_data"
    )
    logger.info(f"PDF uploaded successfully with ID: {pdf.id}")
    
    return PDFInfo(file_id=pdf.id, filename=filename, client=client)

def start_identification_agent():
    with open("prompts/identification_prompt.md", "r") as f:
        prompt = f.read()
    
    CellLineIdentificationAgent = Agent(
        name="CellLineIdentificationAgent",
        tools=[],
        model="gpt-4.1-mini",
        instructions=prompt,
        output_type=List[str]
    )
    return CellLineIdentificationAgent

def start_curation_agent():
    with open("prompts/curation_prompt.md", "r") as f:
        cell_line_curation_prompt = f.read()

    with open("curation_instructions/llm_curation_instructions.md") as f:
        llm_curation_instructions = f.read()

    curation_prompt_combined = cell_line_curation_prompt + '\n\n' + llm_curation_instructions

    CellLineCurationAgent = Agent(
        name="CellLineCurationAgent",
        tools=[],
        model="gpt-5-mini",
        instructions=curation_prompt_combined,
        output_type=CellLineCurationForm
    )

    return CellLineCurationAgent

def start_normalisation_agent():
    with open("prompts/normalisation_prompt.md", "r") as f:
        prompt = f.read()

    CellLineNormalisationAgent = Agent(
        name="CellLineNormalisationAgent",
        tools=[],
        model="gpt-5-mini",
        instructions=prompt,
        output_type=CellLineCurationForm
    )
    return CellLineNormalisationAgent

def initialize_agents() -> Tuple[Any, Any, Any]:
    """
    Initialize the three AI agents for the curation pipeline.
    
    Returns:
        Tuple of (identification_agent, curation_agent, normalization_agent)
    """
    logger.info("Initializing AI agents...")
    
    identification_agent = start_identification_agent()
    curation_agent = start_curation_agent()
    normalization_agent = start_normalisation_agent()
    
    logger.info("All agents initialized successfully")
    return identification_agent, curation_agent, normalization_agent

async def identify_cell_lines(pdf_info: PDFInfo, identification_agent: Any) -> List[str]:
    """
    Run cell line identification on the PDF using the identification agent.
    
    Args:
        pdf_info: PDF information including file_id
        identification_agent: Agent for identifying cell lines
        
    Returns:
        List of identified cell line IDs
    """
    logger.info("STAGE 1: Running Cell Line Identification Agent...")
    identification_start = time.time()
    
    # Prepare input for agent
    pdf_input = [
        {
            "role": "user",
            "content": [
                {
                    "type": "input_file",
                    "file_id": pdf_info.file_id,
                }
            ],
        }
    ]
    
    try:
        identification_result = await asyncio.to_thread(
            Runner.run_sync,
            identification_agent,
            pdf_input
        )
        identification_time = time.time() - identification_start
        
        logger.info(f"Identification completed in {identification_time:.2f}s")
        logger.info(f"Identification result: {identification_result}")
        
        # Extract final output from RunResult object
        cell_lines_found = identification_result.final_output if identification_result.final_output else []
        
        if not cell_lines_found:
            error_msg = "No cell lines identified in the document"
            logger.warning(f"{error_msg}")
            raise ValueError(error_msg)
        
        logger.info(f"Found {len(cell_lines_found)} cell lines: {cell_lines_found}")
        return cell_lines_found
        
    except Exception as e:
        error_msg = f"Identification stage failed: {str(e)}"
        logger.error(f"{error_msg}", exc_info=True)
        raise Exception(error_msg)

async def curate_cell_lines(pdf_info: PDFInfo, curation_agent: Any, cell_lines: List[str]) -> List[Dict[str, Any]]:
    """
    Run curation on each identified cell line.
    
    Args:
        pdf_info: PDF information including file_id
        curation_agent: Agent for curating cell line metadata
        cell_lines: List of cell line IDs to curate
        
    Returns:
        List of curation results with cell_line_id and curation_data
    """
    logger.info("STAGE 2: Running Curation Agent...")
    curation_results = []
    
    for i, cell_line_id in enumerate(cell_lines, 1):
        logger.info(f"Processing cell line {i}/{len(cell_lines)}: {cell_line_id}")
        curation_start = time.time()
        
        try:
            curation_input = [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "input_file",
                            "file_id": pdf_info.file_id,
                        },
                        {
                            "type": "input_text", 
                            "text": f"For the cell line named {cell_line_id}, run metadata curation on the given file using your instructions.",
                        },
                    ],
                }
            ]
            
            curation_result = await asyncio.to_thread(
                Runner.run_sync,
                curation_agent,
                curation_input
            )
            curation_time = time.time() - curation_start
            
            logger.info(f"Curation completed for {cell_line_id} in {curation_time:.2f}s")
            logger.info(f"Curation result: {curation_result.final_output if curation_result else 'None'}")
            
            # Extract final output from RunResult and convert to dict for JSON serialization
            curation_data = curation_result.final_output.model_dump() if curation_result and curation_result.final_output else None
            
            if curation_data:
                curation_results.append({
                    "cell_line_id": cell_line_id,
                    "curation_data": curation_data,
                    "curation_time": curation_time
                })
                logger.info(f"Added curation result for {cell_line_id}")
            else:
                logger.warning(f"No curation result for {cell_line_id}")
                
        except Exception as e:
            logger.error(f"Curation failed for {cell_line_id}: {str(e)}", exc_info=True)
            continue
    
    return curation_results

async def normalize_metadata(curation_results: List[Dict[str, Any]], normalization_agent: Any) -> List[Dict[str, Any]]:
    """
    Run normalization on curated metadata.
    
    Args:
        curation_results: List of curation results from previous stage
        normalization_agent: Agent for normalizing metadata
        
    Returns:
        List of normalized results
    """
    logger.info("STAGE 3: Running Normalization Agent...")
    vocab_context = load_controlled_vocabulary()
    logger.info(f"Controlled vocabulary loaded with {len(vocab_context.controlled_vocabularies)} categories")
    
    normalized_results = []
    
    for curation_result in curation_results:
        cell_line_id = curation_result["cell_line_id"]
        curation_data = curation_result["curation_data"]
        curation_time = curation_result["curation_time"]
        
        logger.info(f"Normalizing metadata for {cell_line_id}")
        normalization_start = time.time()
        
        try:
            # Process each cell line metadata object
            cell_line_metadata_list = curation_data if isinstance(curation_data, list) else [curation_data]
            
            for j, cell_line_metadata_object in enumerate(cell_line_metadata_list):
                logger.info(f"Normalizing metadata object {j+1}/{len(cell_line_metadata_list)} for {cell_line_id}")
                
                normalization_input = [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "input_text",
                                "text": f"Normalize this cell line metadata for {cell_line_id}: {cell_line_metadata_object}",
                            }
                        ],
                    }
                ]
                
                normalisation_result = await asyncio.to_thread(
                    Runner.run_sync,
                    normalization_agent,
                    normalization_input,
                    context=vocab_context
                )
                normalization_time = time.time() - normalization_start
                
                logger.info(f"Normalization completed for {cell_line_id} object {j+1} in {normalization_time:.2f}s")
                
                # Extract final output from RunResult and convert to dict for JSON serialization
                normalized_data = normalisation_result.final_output.model_dump() if normalisation_result and normalisation_result.final_output else None
                
                if normalized_data:
                    normalized_results.append({
                        "cell_line_id": cell_line_id,
                        "metadata_object_index": j,
                        "normalized_data": normalized_data,
                        "processing_times": {
                            "curation_seconds": curation_time,
                            "normalization_seconds": normalization_time
                        }
                    })
                    logger.info(f"Added normalized result for {cell_line_id}")
                else:
                    logger.warning(f"No normalization result for {cell_line_id} object {j+1}")
                    
        except Exception as e:
            logger.error(f"Normalization failed for {cell_line_id}: {str(e)}", exc_info=True)
            continue
    
    return normalized_results

async def validate_cell_lines(normalized_results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Validate normalized cell line data against CellLineCurationForm Pydantic model.

    Args:
        normalized_results: List of normalized results from previous stage

    Returns:
        List of validated results with validation status
    """
    logger.info("STAGE 4: Validating cell line data against Pydantic model...")

    validated_results = []
    validation_errors = 0

    for result in normalized_results:
        cell_line_id = result.get("cell_line_id", "unknown")
        normalized_data = result.get("normalized_data", {})

        logger.info(f"Validating cell line data for {cell_line_id}")

        try:
            # Validate against CellLineCurationForm Pydantic model
            validated_form = CellLineCurationForm(**normalized_data)

            # Create validated result with the validated data
            validated_result = {
                **result,  # Keep original metadata (cell_line_id, processing_times, etc.)
                "validated_data": validated_form.model_dump(),
                "validation_status": "success"
            }

            validated_results.append(validated_result)
            logger.info(f"Successfully validated cell line {cell_line_id}")

        except ValidationError as e:
            validation_errors += 1
            error_msg = f"Validation failed for {cell_line_id}: {str(e)}"
            logger.error(error_msg)

            # Include failed validation in results for debugging
            failed_result = {
                **result,
                "validation_status": "failed",
                "validation_error": str(e),
                "validation_details": e.errors()
            }

            validated_results.append(failed_result)

        except Exception as e:
            validation_errors += 1
            error_msg = f"Unexpected error validating {cell_line_id}: {str(e)}"
            logger.error(error_msg)

            failed_result = {
                **result,
                "validation_status": "error",
                "validation_error": str(e)
            }

            validated_results.append(failed_result)

    successful_validations = len(validated_results) - validation_errors
    logger.info(f"Validation completed: {successful_validations} successful, {validation_errors} failed")

    return validated_results

async def cleanup_and_prepare_result(pdf_info: PDFInfo, validated_results: List[Dict[str, Any]], 
                                   total_start_time: float, cell_lines_found: List[str]) -> Dict[str, Any]:
    """
    Cleanup uploaded files and prepare final result.
    
    Args:
        pdf_info: PDF information including file_id and client
        validated_results: Final validated results
        total_start_time: When the entire process started
        cell_lines_found: Original list of identified cell lines
        
    Returns:
        Final result dictionary
    """
    logger.info("STAGE 8: Cleanup and result preparation...")
    
    # Cleanup uploaded file
    try:
        await pdf_info.client.files.delete(pdf_info.file_id)
        logger.info(f"Cleaned up uploaded file: {pdf_info.file_id}")
    except Exception as e:
        logger.warning(f"Failed to delete uploaded file {pdf_info.file_id}: {e}")
    
    # Calculate total processing time
    total_time = time.time() - total_start_time
    
    # Prepare final result
    final_result = {
        "status": "success",
        "filename": pdf_info.filename,
        "total_processing_time": total_time,
        "cell_lines_found": len(cell_lines_found),
        "successful_validations": len([r for r in validated_results if r.get("validation_status") == "success"]),
        "results": validated_results,
        "identification_result": cell_lines_found
    }
    
    logger.info(f"Final result summary: {final_result['successful_validations']} successful validations out of {final_result['cell_lines_found']} cell lines found")
    logger.info(f"Curation process completed! Total time: {total_time:.2f}s")
    
    return final_result