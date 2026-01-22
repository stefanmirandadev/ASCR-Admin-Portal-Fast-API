import pytest
import tempfile
import shutil
from pathlib import Path
import os


class TestDataTransport:
    """TDD tests for DataTransport - orchestrates storage + version control"""
    
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
    def storage(self, temp_dir):
        """Create storage instance"""
        from storage import FileStorage
        return FileStorage()
    
    @pytest.fixture
    def version_control(self, storage):
        """Create version control instance"""
        from version_control import VersionControl
        return VersionControl(storage)
    
    @pytest.fixture
    def data_transport(self, storage, version_control):
        """This test will fail until we create DataTransport class"""
        from data_transport import DataTransport
        return DataTransport(storage, version_control)

    @pytest.fixture
    def sample_data(self):
        """Sample cell line data"""
        return {
            "cell_line": [{"hpscreg_name": "TestCell001"}],
            "content": "test content"
        }

    # Test DataTransport class exists and has proper initialization
    def test_data_transport_class_exists(self, storage, version_control):
        """Test that DataTransport class exists and can be initialized"""
        from data_transport import DataTransport
        
        dt = DataTransport(storage, version_control)
        assert dt.storage is not None
        assert dt.version_control is not None
        assert hasattr(dt, 'storage')
        assert hasattr(dt, 'version_control')

    # Test move_to_ready_with_versioning orchestration
    def test_move_to_ready_with_versioning_creates_first_version(self, data_transport, storage, sample_data):
        """Test move_to_ready_with_versioning creates v0 for new cell line"""
        # Setup: create file in working
        storage.create("TestCell001", sample_data, "working")
        
        # Test: move to ready with versioning
        result = data_transport.move_to_ready_with_versioning("TestCell001")
        
        assert result["status"] == "success"
        assert result["version"] == 0
        assert result["filename"] == "TestCell001_v0"
        
        # Verify: versioned file exists in ready, original removed from working
        assert storage.exists("TestCell001_v0", "ready")
        assert not storage.exists("TestCell001", "working")

    def test_move_to_ready_with_versioning_increments_version(self, data_transport, storage, sample_data):
        """Test move_to_ready_with_versioning increments version for existing cell line"""
        # Setup: create first version manually
        storage.create("TestCell001_v0", sample_data, "ready")
        
        # Setup: create new working file
        updated_data = sample_data.copy()
        updated_data["content"] = "updated content"
        storage.create("TestCell001", updated_data, "working")
        
        # Test: move to ready with versioning should create v1
        result = data_transport.move_to_ready_with_versioning("TestCell001")
        
        assert result["status"] == "success"
        assert result["version"] == 1
        assert result["filename"] == "TestCell001_v1"
        
        # Verify: both versions exist in ready
        assert storage.exists("TestCell001_v0", "ready")
        assert storage.exists("TestCell001_v1", "ready")
        assert not storage.exists("TestCell001", "working")

    def test_move_to_ready_with_versioning_fails_for_missing_file(self, data_transport):
        """Test move_to_ready_with_versioning fails for non-existent file"""
        with pytest.raises(FileNotFoundError, match="not found in working directory"):
            data_transport.move_to_ready_with_versioning("NonExistent")

    def test_move_to_ready_with_versioning_handles_working_suffix(self, data_transport, storage, sample_data):
        """Test move_to_ready_with_versioning handles _working suffix in filename"""
        # Setup: create file with _working suffix
        storage.create("TestCell001_working", sample_data, "working")
        
        # Test: move file with _working suffix
        result = data_transport.move_to_ready_with_versioning("TestCell001_working")
        
        assert result["status"] == "success"
        assert result["version"] == 0
        assert result["filename"] == "TestCell001_v0"
        
        # Verify: versioned file created with correct base name
        assert storage.exists("TestCell001_v0", "ready")
        assert not storage.exists("TestCell001_working", "working")

    # Test move_to_working (simple delegation)
    def test_move_to_working_delegates_to_storage(self, data_transport, storage, sample_data):
        """Test move_to_working simply delegates to storage move operation"""
        # Setup: create file in ready
        storage.create("TestCell001_v0", sample_data, "ready")
        
        # Test: move to working
        result = data_transport.move_to_working("TestCell001_v0")
        
        assert result["status"] == "success"
        
        # Verify: file moved from ready to working
        assert storage.exists("TestCell001_v0", "working")
        assert not storage.exists("TestCell001_v0", "ready")

    def test_move_to_working_fails_for_missing_file(self, data_transport):
        """Test move_to_working fails for non-existent file"""
        with pytest.raises(FileNotFoundError):
            data_transport.move_to_working("NonExistent")

    # Test that DataTransport orchestrates but doesn't duplicate logic
    def test_data_transport_orchestrates_without_duplicating_logic(self, data_transport):
        """Test that DataTransport composes other classes without duplicating their logic"""
        # Should not have version calculation logic (that's in VersionControl)
        assert not hasattr(data_transport, 'parse_version_from_filename')
        assert not hasattr(data_transport, 'get_next_version')
        
        # Should not have file operation logic (that's in storage)
        assert not hasattr(data_transport, 'create')
        assert not hasattr(data_transport, '_save_json_file')
        
        # Should compose other services
        assert hasattr(data_transport, 'storage')
        assert hasattr(data_transport, 'version_control')

    # Test error handling in orchestration
    def test_move_to_ready_with_versioning_handles_storage_errors(self, data_transport, storage, version_control, sample_data):
        """Test that DataTransport handles errors from composed services properly"""
        # Setup: create file in working
        storage.create("TestCell001", sample_data, "working")
        
        # Mock storage to raise error during create
        original_create = storage.create
        def failing_create(*args, **kwargs):
            raise Exception("Storage error")
        storage.create = failing_create
        
        # Test: should propagate storage errors
        with pytest.raises(Exception, match="Storage error"):
            data_transport.move_to_ready_with_versioning("TestCell001")
        
        # Cleanup
        storage.create = original_create

    # Test the complete workflow
    def test_complete_versioning_workflow(self, data_transport, storage, sample_data):
        """Test complete workflow: create -> move -> create -> move creates proper versions"""
        # Step 1: Create initial working file
        storage.create("TestCell001", sample_data, "working")
        
        # Step 2: Move to ready (should create v0)
        result1 = data_transport.move_to_ready_with_versioning("TestCell001")
        assert result1["version"] == 0
        assert result1["filename"] == "TestCell001_v0"
        
        # Step 3: Create new working file
        updated_data = sample_data.copy()
        updated_data["content"] = "version 2 content"
        storage.create("TestCell001", updated_data, "working")
        
        # Step 4: Move to ready again (should create v1)
        result2 = data_transport.move_to_ready_with_versioning("TestCell001")
        assert result2["version"] == 1
        assert result2["filename"] == "TestCell001_v1"
        
        # Step 5: Verify both versions exist
        assert storage.exists("TestCell001_v0", "ready")
        assert storage.exists("TestCell001_v1", "ready")
        assert not storage.exists("TestCell001", "working")
        
        # Step 6: Verify content is correct
        v0_data = storage.get("TestCell001_v0", "ready")
        v1_data = storage.get("TestCell001_v1", "ready")
        assert v0_data["data"]["content"] == "test content"
        assert v1_data["data"]["content"] == "version 2 content"