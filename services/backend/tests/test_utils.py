import pytest
import json
from pathlib import Path
import utils

# Note: These tests are for legacy utils functions that are no longer used in the main application.
# The primary testing is now done in test_datastore.py for the CellLineDataStore class.
# These tests are kept for testing the helper functions that are still used by the datastore.

class TestUtilsHelperFunctions:
    """Test cases for utility helper functions that are still used"""
    
    def test_get_frontend_schema(self):
        """Test that get_frontend_schema still works for the API"""
        from data_dictionaries.curation_models import CellLineCurationForm
        result = utils.get_frontend_schema(CellLineCurationForm)

        assert "schema" in result
        assert "fields" in result["schema"]
        assert result["model_name"] == "CellLineCurationForm"