from typing import Dict, Any, List, Tuple
import logging
from pydantic import ValidationError
from data_dictionaries.curation_models import CellLineCurationForm

logger = logging.getLogger(__name__)

class CellLineValidation:
    """
    Cell line validation pipeline for processing curated cell line data.
    Validates against CellLineCurationForm Pydantic model.
    """

    def __init__(self):
        """Initialize the validation pipeline"""
        self.logger = logger

    def validate(self, cell_line_data: Dict[str, Any]) -> Dict[str, Any]:

        cell_line_id = cell_line_data.get("cell_line_id", "unknown")
        self.logger.info(f"Starting validation pipeline for cell line: {cell_line_id}")

        try:
            # Run validation pipeline steps
            result = self._validate_single_cell_line(cell_line_data)
            self.logger.info(f"Validation pipeline completed successfully for {cell_line_id}")
            return result

        except Exception as e:
            self.logger.error(f"Validation failed for cell line {cell_line_id}: {str(e)}")
            return {
                "cell_line_id": cell_line_id,
                "validation_status": "failed",
                "validation_error": str(e),
                "original_data": cell_line_data
            }

    def _validate_single_cell_line(self, cell_line_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate a single cell line against the CellLineCurationForm Pydantic model.

        Args:
            cell_line_data: Dict containing cell_line_id and normalized_data

        Returns:
            Dict with validation results including validated_data if successful
        """
        cell_line_id = cell_line_data.get("cell_line_id", "unknown")
        normalized_data = cell_line_data.get("normalized_data", {})

        try:
            # Validate against CellLineCurationForm Pydantic model
            validated_form = CellLineCurationForm(**normalized_data)

            return {
                "cell_line_id": cell_line_id,
                "validation_status": "success",
                "validated_data": validated_form.model_dump(),
                "processing_times": cell_line_data.get("processing_times", {})
            }

        except ValidationError as e:
            self.logger.warning(f"Pydantic validation failed for {cell_line_id}: {str(e)}")
            return {
                "cell_line_id": cell_line_id,
                "validation_status": "failed",
                "validation_error": str(e),
                "validation_details": e.errors(),
                "original_data": normalized_data
            }  