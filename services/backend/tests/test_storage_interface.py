import pytest
import tempfile
import shutil
from pathlib import Path
import os
from abc import ABC


class TestNewStorageInterface:
    """TDD tests for new pure CRUD StorageInterface - no versioning, just file operations"""
    
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
    def sample_data(self):
        """Sample cell line data for testing"""
        return {
            "cell_line": [{"hpscreg_name": "TestCell001"}],
            "content": "test content"
        }
    
    @pytest.fixture
    def storage_implementation(self, temp_dir):
        """This test will fail until we create the new interface and implementation"""
        from storage import StorageInterface, FileStorage
        return FileStorage()

    # Test that StorageInterface exists and is an ABC
    def test_new_storage_interface_is_abstract(self):
        """Test that new StorageInterface exists and cannot be instantiated directly"""
        from storage import StorageInterface
        
        # Should be an abstract base class
        assert issubclass(StorageInterface, ABC)
        
        # Should not be instantiable
        with pytest.raises(TypeError):
            StorageInterface()

    def test_new_storage_interface_has_pure_crud_methods(self):
        """Test that new StorageInterface defines pure CRUD methods only"""
        from storage import StorageInterface
        
        # Get all abstract methods
        abstract_methods = StorageInterface.__abstractmethods__
        
        # Should have pure CRUD methods
        expected_methods = {
            'create', 'get', 'update', 'delete', 
            'list_files', 'exists', 'get_files_for_base_name'
        }
        
        assert expected_methods.issubset(abstract_methods)
        
        # Should NOT have versioning methods (those are in other classes now)
        versioning_methods = {'move_to_ready_with_versioning', 'get_versions_for_base_name'}
        for method in versioning_methods:
            assert method not in abstract_methods

    # Test create method with location parameter
    def test_create_in_working_location(self, storage_implementation, sample_data):
        """Test create method can specify working location"""
        result = storage_implementation.create("TestCell001", sample_data, "working")
        
        assert result["status"] == "success"
        assert result["filename"] == "TestCell001"
        assert storage_implementation.exists("TestCell001", "working")

    def test_create_in_ready_location(self, storage_implementation, sample_data):
        """Test create method can specify ready location"""
        result = storage_implementation.create("TestCell001", sample_data, "ready")
        
        assert result["status"] == "success"
        assert result["filename"] == "TestCell001"
        assert storage_implementation.exists("TestCell001", "ready")

    def test_get_from_specific_location(self, storage_implementation, sample_data):
        """Test get method retrieves from specific location"""
        # Create in working
        storage_implementation.create("TestCell001", sample_data, "working")
        
        # Should find in working
        result = storage_implementation.get("TestCell001", "working")
        assert result is not None
        assert result["location"] == "working"
        
        # Should not find in ready
        result = storage_implementation.get("TestCell001", "ready")
        assert result is None

    def test_update_in_specific_location(self, storage_implementation, sample_data):
        """Test update method works in specific location"""
        # Create in ready
        storage_implementation.create("TestCell001", sample_data, "ready")
        
        # Update in ready
        updated_data = sample_data.copy()
        updated_data["content"] = "updated content"
        
        result = storage_implementation.update("TestCell001", updated_data, "ready")
        assert result["status"] == "success"
        assert result["action"] == "updated"
        
        # Verify updated in ready
        retrieved = storage_implementation.get("TestCell001", "ready")
        assert retrieved["data"]["content"] == "updated content"

    def test_delete_from_specific_location(self, storage_implementation, sample_data):
        """Test delete method works in specific location"""
        # Create in both locations
        storage_implementation.create("TestCell001", sample_data, "working")
        storage_implementation.create("TestCell001", sample_data, "ready")
        
        # Delete from working only
        result = storage_implementation.delete("TestCell001", "working")
        assert result["status"] == "success"
        
        # Should be gone from working but still in ready
        assert not storage_implementation.exists("TestCell001", "working")
        assert storage_implementation.exists("TestCell001", "ready")

    def test_get_files_for_base_name(self, storage_implementation, sample_data):
        """Test get_files_for_base_name returns files matching base name"""
        # Create files with same base name but different suffixes
        storage_implementation.create("TestCell001", sample_data, "ready")
        storage_implementation.create("TestCell001_v0", sample_data, "ready")
        storage_implementation.create("TestCell001_v1", sample_data, "ready")
        storage_implementation.create("TestCell002", sample_data, "ready")  # Different base
        
        # Should return all files with TestCell001 base name
        files = storage_implementation.get_files_for_base_name("TestCell001", "ready")
        
        assert "TestCell001" in files
        assert "TestCell001_v0" in files
        assert "TestCell001_v1" in files
        assert "TestCell002" not in files

    def test_file_data_store_implements_interface(self, storage_implementation):
        """Test that FileStorage properly implements new StorageInterface"""
        from storage import StorageInterface
        
        # Should be instance of interface
        assert isinstance(storage_implementation, StorageInterface)

    def test_no_versioning_logic_in_storage(self, storage_implementation, sample_data):
        """Test that storage has no versioning logic - just pure CRUD"""
        # Storage should not have move_to_ready_with_versioning
        assert not hasattr(storage_implementation, 'move_to_ready_with_versioning')
        
        # Storage should not calculate versions
        assert not hasattr(storage_implementation, 'get_next_version')
        
        # Storage should just do what it's told with filenames
        storage_implementation.create("TestCell001_v999", sample_data, "ready")
        assert storage_implementation.exists("TestCell001_v999", "ready")