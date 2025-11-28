import json
import os
import tempfile
import base64
import io
import logging
import time
from pathlib import Path
from openai import OpenAI
import openai
from pdf2image import convert_from_bytes
from PIL import Image
from dotenv import load_dotenv

def load_config() -> dict:
    """Load configuration from config.json file."""
    # Load environment variables from .env file (override system env vars)
    load_dotenv(override=True)

    config_path = Path(__file__).parent / "config.json"

    with open(config_path, "r") as f:
        config = json.load(f)

    # Require API key to be set in environment variable
    if "OPENAI_API_KEY" not in os.environ:
        raise ValueError("OPENAI_API_KEY environment variable must be set. Please add it to your .env file.")

    config["openai_api_key"] = os.environ["OPENAI_API_KEY"]

    return config


def convert_pdf_to_images(pdf_bytes: bytes, max_pages: int = 10) -> list:
    """
    Convert PDF bytes to a list of base64-encoded images.
    
    Args:
        pdf_bytes: PDF file as bytes
        max_pages: Maximum number of pages to convert (default: 10)
    
    Returns:
        List of base64-encoded image strings
    """
    try:
        # Convert PDF to PIL images
        images = convert_from_bytes(pdf_bytes, first_page=1, last_page=max_pages)
        
        base64_images = []
        for image in images:
            # Convert PIL image to base64
            buffer = io.BytesIO()
            image.save(buffer, format='PNG')
            img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            base64_images.append(img_base64)
        
        return base64_images
    
    except Exception as e:
        raise Exception(f"Failed to convert PDF to images: {str(e)}")



def identify_cell_lines(article_images: list, config_override: dict = None) -> dict:
    
    logger = logging.getLogger('identify_cell_lines')

    # Load configuration
    config = load_config()

    # Override with custom config if provided
    if config_override:
        config.update(config_override)

    api_key = config["openai_api_key"]
    model_name = config["model"]
    temperature = config["temperature"]
    

    # Gets all the unique cell lines reported in the article
    get_cell_line_names_prompt = """You are a careful and meticulous stem cell research assistant.

TASK: Extract unique stem cell line identifiers from a research article.

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
1. Only capture unique cell lines NEWLY DERIVED/GENERATED in this study
2. Ignore commercial cell lines, controls from other studies, or parental lines
3. Ignore generic terms like "iPSC line" or "control cells"
4. Return EXACTLY the identifiers that appear in the paper
5. Each identifier should appear only once in your list

OUTPUT FORMAT:
Return a valid Python list with quoted strings.

EXAMPLES:
- Registry IDs: ["AIBNi001", "AIBNi002", "MCRIi001-A"]
- Alternative names: ["hES3.1", "hES3.2", "hES3.3"]
- Mixed formats: ["SIVF001", "SIVF002", "Control-line"]
- For no new cell lines: -1

Return only the list or -1, nothing else."""

    try:
        logger.info("Identifying unique cell line names in the article...")
        
        # Building the request message content
        client = OpenAI(api_key=api_key)
        message_content = [{"type": "text", "text": get_cell_line_names_prompt}]
        
        # Add each page as an image
        for i, img_base64 in enumerate(article_images):
            message_content.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/png;base64,{img_base64}"}
            })
            
        logger.info(f"Sending {len(article_images)} images to {model_name} for cell line identification...")
        
        # Sending the cell line identification request
        start_time = time.time()
        response = client.chat.completions.create(
            model=model_name,
            messages=[{"role": "user", "content": message_content}],
            temperature=temperature
        )
        end_time = time.time()
        identification_time = end_time - start_time
        response_data = response.choices[0].message.content
        logger.info("Response received from OpenAI API for cell line identification")
        
    # Request failure to OpenAI API re: identification request
    except Exception as e:
        return {
            "error": f"Cell line identification request failure. Please inspect raw API response: {str(e)}"
        }
    
    # Request success without exception 
    # Identification list parsing
    try:
        identifications = parse_cell_line_identification_response(response_data)
    except Exception as e:
        return {
            "error": f"Identification list parsing error. Please inspect raw response from Open AI.: {str(e)}",
            "raw_response":response_data
        }
        
    # Successful identification and list parsing
    logger.info(f"Successfully identified {len(identifications)} unique cell lines:")
    for i, cell_line in enumerate(identifications, 1):
        logger.info(f"  {i}. {cell_line}")
    logger.info(f"Complete list: {identifications}")
    return identifications
            
    


def parse_cell_line_identification_response(response_data: str) -> list | Exception:
    
    import ast
    logger = logging.getLogger('parse_cell_line_identification_response')
    logger.info("Parsing cell line names from response...")
    data = response_data
    
    # Try to find a Python list in the response
    if "```python" in data:
        # Extract content between ```python and ```
        start = data.find("```python") + 9
        end = data.find("```", start)
        list_str = data[start:end].strip()
    else:
        list_str = data.strip()

    # Parse the list
    unique_cell_lines = ast.literal_eval(list_str)
    if not isinstance(unique_cell_lines, list):
        raise Exception()
    return unique_cell_lines
    
def extract_json_from_codeblock(text):
    
    import re
    # Pattern to match ```json ... ```
    pattern = r'```json\s*(.*?)\s*```'
    
    # Search for the pattern (DOTALL flag allows . to match newlines)
    match = re.search(pattern, text, re.DOTALL)
    
    if match:
        json_string = match.group(1)
        try:
            # Parse the JSON string
            return json.loads(json_string)
        except json.JSONDecodeError as e:
            print(f"Error parsing JSON: {e}")
            return None
    else:
        print("No JSON code block found")
        return None


def curate_article(article: bytes, config_override: dict = None) -> str:

    # Get logger
    logger = logging.getLogger('curate_article')

    # Configuration loading and setup 
    config = load_config()
    if config_override:
        config.update(config_override)
    api_key = config["openai_api_key"]
    model_name = config["model"]
    temperature = config["temperature"]
    
    
    # Conversion of PDF to images for OCR processing
    try:
        logger.info("Converting PDF to images for vision processing...")
        article_images = convert_pdf_to_images(article)
        logger.info(f"Successfully converted PDF to {len(article_images)} images")
    except Exception as e:
        return f"Error converting PDF to images: {str(e)}"


    # Identification of unique stem cell line identifiers from the article
    
    identification_result = identify_cell_lines(article_images, config)
    if "error" in identification_result:
        logger.error(f"Error during cell line identification. See logs for details")
        return identification_result

    # Extract results
    unique_cell_lines = identification_result

    # Handle case where no cell lines found
    if unique_cell_lines == -1:
        return -1
    
    # Result objects that user will receive
    structured_outputs = dict()
    failed_cell_line_names = []

    logger.info(f"Starting metadata curation for {len(unique_cell_lines)} cell lines...")

    # Send curation requests for each unique cell line reported in the paper
    for i, cell_line in enumerate(unique_cell_lines, 1):
        logger.info(f"[{i}/{len(unique_cell_lines)}] Processing cell line: {cell_line}")
        success = False
        max_retries = 3
        for attempt in range(max_retries):

            # Send curation request for the cell line...
            logger.info(f"  Attempt {attempt + 1}/{max_retries} - Curating metadata for {cell_line}...")
            response = curate_line(article, cell_line, config)

            # Handle both success and error cases
            if isinstance(response, dict) and "result" in response:
                
                # Successful response with usage data
                result = extract_json_from_codeblock(response["result"])
                structured_outputs[cell_line] = result
                success = True
                logger.info(f"Successful curation for cell line {cell_line}")
                break
            else:
                # Error response (string)
                logger.warning(f"  Attempt {attempt + 1} failed for {cell_line}: {str(response)[:100]}...")

            # If this was the last attempt and still failed
            if attempt == max_retries - 1:
                failed_cell_line_names.append(cell_line)
                logger.error(f"  Failed to curate {cell_line} after {max_retries} attempts")


    # Log final summary and usage
    logger.info(f"Curation completed - Successfully curated: {len(structured_outputs)}, Failed: {len(failed_cell_line_names)}")

    # Return results with failed cell lines info and usage metadata
    return {
        "curated_data": structured_outputs,
        "failed_cell_lines": failed_cell_line_names,
        "total_cell_lines": len(unique_cell_lines),
        "successful_curations": len(structured_outputs),
    }


def curate_line(article: bytes, cell_line: str, config_override: dict = None) -> str:

    # Get logger
    logger = logging.getLogger('curate_line')

    # Load config for this function
    config = load_config()

    # Override with custom config if provided
    if config_override:
        config.update(config_override)

    api_key = config["openai_api_key"]
    model_name = config["model"]
    temperature = config["temperature"]
    # Convert PDF to images for vision processing
    try:
        article_images = convert_pdf_to_images(article)
    except Exception as e:
        logger.error(f"Error converting PDF to images for {cell_line}: {str(e)}")
        return f"Error converting PDF to images: {str(e)}"

    # Load curation instructions from config-specified file
    instructions_path = config.get("instructions_path", "curation_instructions.md")

    # Handle both absolute and relative paths
    if not Path(instructions_path).is_absolute():
        # Try relative to project root first (where test config points to)
        project_root = Path(__file__).parent.parent.parent
        full_instructions_path = project_root / instructions_path
        if not full_instructions_path.exists():
            # Fall back to relative to curate.py location
            full_instructions_path = Path(__file__).parent / instructions_path
    else:
        full_instructions_path = Path(instructions_path)

    logger.info(f"Loading curation instructions from: {full_instructions_path}")
    with open(full_instructions_path, "r") as f:
        curation_instructions = f.read()

    try:
        logger.debug(f"Sending metadata curation request for {cell_line} to {model_name}...")
        client = OpenAI(api_key=api_key)

        system_prompt = f"""You are a knowledgeable assistant trained to retrieve stem cell line metadata from research literature.
You are only curating metadata for the cell line with the name {cell_line}.
Ignore metadata for any other cell line.
You must respond with a JSON string containing the metadata for this cell line.
Wrap the JSON response in a JSON codeblock. Your output should not have any other commentary.
Here are the detailed curation instructions you must follow:
{curation_instructions}"""

        # Create message content with images
        user_content = [{"type": "text", "text": f"Please extract metadata for the cell line '{cell_line}' from this research article:"}]

        # Add each page as an image
        for i, img_base64 in enumerate(article_images):
            user_content.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/png;base64,{img_base64}"}
            })

        # Track timing for the API call
        start_time = time.time()
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            temperature=temperature
        )
        end_time = time.time()
        curation_time = end_time - start_time

        result = response.choices[0].message.content

        # Capture raw response for debugging
        raw_response = {
            "id": response.id,
            "model": response.model,
            "choices": [
                {
                    "message": {
                        "role": choice.message.role,
                        "content": choice.message.content
                    },
                    "finish_reason": choice.finish_reason
                } for choice in response.choices
            ],
            "usage": {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens
            }
        }

        # Track usage metadata for cost calculation and timing
        usage = response.usage
        usage_data = {
            "prompt_tokens": usage.prompt_tokens,
            "completion_tokens": usage.completion_tokens,
            "total_tokens": usage.total_tokens,
            "curation_time_seconds": curation_time,
            "raw_response": raw_response
        }
        logger.debug(f"Metadata curation usage for {cell_line} - Prompt: {usage.prompt_tokens}, Completion: {usage.completion_tokens}, Total: {usage.total_tokens} tokens")
        logger.debug(f"Received metadata curation response for {cell_line}")

        return {"result": result, "usage": usage_data}
    except openai.APIError as e:
        logger.error(f"OpenAI API Error during metadata curation for {cell_line}: {str(e)}")
        
        # Capture detailed OpenAI API error response
        error_response = {
            "error_type": "OpenAI_APIError",
            "error_message": str(e),
            "raw_error": str(e),
            "cell_line": cell_line
        }
        
        # Extract OpenAI API error details
        if hasattr(e, 'response'):
            error_response["http_status"] = e.response.status_code
            try:
                error_response["raw_response"] = e.response.json()
            except:
                error_response["raw_response"] = e.response.text
        
        if hasattr(e, 'status_code'):
            error_response["status_code"] = e.status_code
            
        if hasattr(e, 'body'):
            error_response["body"] = e.body
        
        return {
            "error": str(e),
            "usage": {
                "error_response": error_response
            }
        }
        
    except Exception as e:
        logger.error(f"General exception during metadata curation for {cell_line}: {str(e)}")
        
        # Capture general error response for debugging
        error_response = {
            "error_type": type(e).__name__,
            "error_message": str(e),
            "raw_error": str(e),
            "cell_line": cell_line
        }
        
        return {
            "error": str(e),
            "usage": {
                "error_response": error_response
            }
        }
    
    

    
    