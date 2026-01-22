import pytest
import tempfile
import shutil
from pathlib import Path
import os


class TestVersionControl:
    """TDD tests for VersionControl - pure versioning logic with no file operations"""
    
    @pytest.fixture
    def temp_dir(self):
        """Create temporary directory for isolated tests"""
        temp_dir = tempfile.mkdtemp()
        original_cwd = os.getcwd()
        os.chdir(temp_dir)
        
        yield temp_dir
        
        # Cleanup
        os.chdir(original_cwd)
        shutil.rmtree(temp_dir)
    
    @pytest.fixture
    def mock_storage(self, temp_dir):
        """Mock storage for testing VersionControl"""
        from storage import FileStorage
        return FileStorage()
    
    @pytest.fixture
    def version_control(self, mock_storage):
        """This test will fail until we create VersionControl class"""
        from version_control import VersionControl
        return VersionControl(mock_storage)

    @pytest.fixture
    def sample_data(self):
        """Sample cell line data"""
        return {
            "cell_line": [{"hpscreg_name": "TestCell001"}],
            "content": "test content"
        }

    # Test VersionControl class exists and has proper initialization
    def test_version_control_class_exists(self, mock_storage):
        """Test that VersionControl class exists and can be initialized"""
        from version_control import VersionControl
        
        vc = VersionControl(mock_storage)
        assert vc.storage is not None
        assert hasattr(vc, 'storage')

    # Test get_next_version logic
    def test_get_next_version_for_new_cell_line(self, version_control):
        """Test get_next_version returns 0 for new cell line"""
        existing_files = []  # No existing files
        
        version = version_control.get_next_version("TestCell001", existing_files)
        assert version == 0

    def test_get_next_version_increments_existing_versions(self, version_control):
        """Test get_next_version increments from existing versions"""
        existing_files = ["TestCell001_v0", "TestCell001_v1", "TestCell001_v2"]
        
        version = version_control.get_next_version("TestCell001", existing_files)
        assert version == 3

    def test_get_next_version_handles_gaps_in_versions(self, version_control):
        """Test get_next_version finds max version even with gaps"""
        existing_files = ["TestCell001_v0", "TestCell001_v5", "TestCell001_v2"]
        
        version = version_control.get_next_version("TestCell001", existing_files)
        assert version == 6  # Should be max(5) + 1

    def test_get_next_version_ignores_invalid_version_formats(self, version_control):
        """Test get_next_version ignores malformed version names"""
        existing_files = ["TestCell001_v0", "TestCell001_invalid", "TestCell001_v1"]
        
        version = version_control.get_next_version("TestCell001", existing_files)
        assert version == 2  # Should ignore 'invalid' and return max(1) + 1

    # Test parse_version_from_filename
    def test_parse_version_from_filename_valid_format(self, version_control):
        """Test parsing version number from valid filename"""
        version = version_control.parse_version_from_filename("TestCell001_v5")
        assert version == 5

    def test_parse_version_from_filename_invalid_format(self, version_control):
        """Test parsing version from invalid filename returns None"""
        version = version_control.parse_version_from_filename("TestCell001_invalid")
        assert version is None

    def test_parse_version_from_filename_no_version_suffix(self, version_control):
        """Test parsing version from filename without version suffix"""
        version = version_control.parse_version_from_filename("TestCell001")
        assert version is None

    # Test create_versioned_filename
    def test_create_versioned_filename(self, version_control):
        """Test creating versioned filename"""
        filename = version_control.create_versioned_filename("TestCell001", 5)
        assert filename == "TestCell001_v5"

    def test_create_versioned_filename_zero_version(self, version_control):
        """Test creating versioned filename with version 0"""
        filename = version_control.create_versioned_filename("TestCell001", 0)
        assert filename == "TestCell001_v0"

    # Test extract_base_name
    def test_extract_base_name_from_working_file(self, version_control):
        """Test extracting base name from working file"""
        base_name = version_control.extract_base_name("TestCell001_working")
        assert base_name == "TestCell001"

    def test_extract_base_name_from_versioned_file(self, version_control):
        """Test extracting base name from versioned file"""
        base_name = version_control.extract_base_name("TestCell001_v5")
        assert base_name == "TestCell001"

    def test_extract_base_name_from_plain_filename(self, version_control):
        """Test extracting base name from plain filename (no suffix)"""
        base_name = version_control.extract_base_name("TestCell001")
        assert base_name == "TestCell001"

    # Test get_latest_version
    def test_get_latest_version_finds_highest(self, version_control):
        """Test get_latest_version finds filename with highest version"""
        existing_files = ["TestCell001_v0", "TestCell001_v5", "TestCell001_v2"]
        
        latest = version_control.get_latest_version(existing_files)
        assert latest == "TestCell001_v5"

    def test_get_latest_version_empty_list(self, version_control):
        """Test get_latest_version returns None for empty list"""
        latest = version_control.get_latest_version([])
        assert latest is None

    def test_get_latest_version_no_valid_versions(self, version_control):
        """Test get_latest_version returns None when no valid versions"""
        existing_files = ["TestCell001_invalid", "TestCell001_bad"]
        
        latest = version_control.get_latest_version(existing_files)
        assert latest is None

    # Test get_all_versions (delegates to storage)
    def test_get_all_versions_delegates_to_storage(self, version_control, mock_storage, sample_data):
        """Test get_all_versions delegates to storage.get_files_for_base_name"""
        # Setup: create some files in storage
        mock_storage.create("TestCell001_v0", sample_data, "ready")
        mock_storage.create("TestCell001_v1", sample_data, "ready")
        
        # Test: get_all_versions should delegate to storage
        versions = version_control.get_all_versions("TestCell001")
        
        assert "TestCell001_v0" in versions
        assert "TestCell001_v1" in versions
        assert len(versions) == 2

    # Test get_latest_version_data (combines storage + versioning logic)
    def test_get_latest_version_data_returns_latest_data(self, version_control, mock_storage, sample_data):
        """Test get_latest_version_data returns data for the latest version"""
        # Setup: create multiple versions
        v0_data = sample_data.copy()
        v0_data["content"] = "version 0 content"
        mock_storage.create("TestCell001_v0", v0_data, "ready")
        
        v1_data = sample_data.copy() 
        v1_data["content"] = "version 1 content"
        mock_storage.create("TestCell001_v1", v1_data, "ready")
        
        # Test: should return latest version data
        result = version_control.get_latest_version_data("TestCell001")
        
        assert result["base_name"] == "TestCell001"
        assert result["latest_version"] == 1
        assert result["filename"] == "TestCell001_v1"
        assert result["data"]["content"] == "version 1 content"

    def test_get_latest_version_data_no_versions_found(self, version_control):
        """Test get_latest_version_data raises error when no versions exist"""
        with pytest.raises(FileNotFoundError, match="No versions found"):
            version_control.get_latest_version_data("NonExistent")

    # Test that VersionControl has no file operations
    def test_version_control_has_no_file_operations(self, version_control):
        """Test that VersionControl doesn't do file operations directly"""
        # Should not have file operation methods
        assert not hasattr(version_control, 'create')
        assert not hasattr(version_control, 'delete') 
        assert not hasattr(version_control, 'update')
        
        # Should delegate file operations to storage
        assert hasattr(version_control, 'storage')