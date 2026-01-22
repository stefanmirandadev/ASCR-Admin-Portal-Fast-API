from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)


class DataTransport:
    """Orchestrates changing the state of cell line records between working, queued and registered states.
        
    """
    
    def __init__(self, storage, version_control):
        """Initialize DataTransport with storage and version control dependencies.
        
        Sets up the orchestration layer by injecting the required storage and version control
        dependencies. This follows the Dependency Injection pattern for loose coupling.
        
        Args:
            storage: StorageInterface implementation for file operations. Must implement
                all required CRUD operations and file management methods.
            version_control: VersionControl instance for versioning logic. Must be
                initialized with the same storage instance for consistency.
        """
        self.storage = storage
        self.version_control = version_control
    
    def move_to_ready_with_versioning(self, working_filename: str) -> Dict[str, Any]:
        """Move file from working to ready with automatic versioning.
        
        This is the primary orchestration method that handles the complete workflow for
        moving a working file to ready status with automatic version management. The method
        coordinates multiple services to ensure data integrity and proper versioning.
        
        Orchestration workflow:
            1. Validate file exists in working directory
            2. Extract base name from working filename (removes _working suffixes)
            3. Query existing versions for the base name from ready directory
            4. Calculate next version number using VersionControl logic
            5. Generate new versioned filename (e.g., TestCell001_v2)
            6. Read cell line data from working directory
            7. Create new versioned file in ready directory
            8. Remove original file from working directory
        
        Args:
            working_filename (str): Name of the file in working directory to move.
                Can include suffixes like '_working' which will be normalized during processing.
                
        Returns:
            Dict[str, Any]: Operation result dictionary containing:
                - status (str): "success" if operation completed successfully
                - version (int): Version number assigned to the moved file
                - filename (str): Name of the versioned file in ready directory
                - message (str): Human-readable success message
                
        Raises:
            FileNotFoundError: If the specified file doesn't exist in working directory,
                or if file data cannot be read from storage.
            Exception: For any storage operation failures during the move process.
                The original exception is re-raised to preserve error details.
                
        Example:
            >>> dt = DataTransport(storage, version_control)
            >>> result = dt.move_to_ready_with_versioning("TestCell001_working")
            >>> print(f"Success: {result['filename']} version {result['version']}")
            'Success: TestCell001_v0 version 0'
        """
        # Check if file exists in working directory
        if not self.storage.exists(working_filename, "working"):
            raise FileNotFoundError(f"File '{working_filename}' not found in working directory")
        
        # Extract base name from working filename
        base_name = self.version_control.extract_base_name(working_filename)
        
        # Get existing versions for this base name
        existing_versions = self.version_control.get_all_versions(base_name)
        
        # Calculate next version number
        next_version = self.version_control.get_next_version(base_name, existing_versions)
        
        # Create versioned filename
        versioned_filename = self.version_control.create_versioned_filename(base_name, next_version)
        
        # Get the cell line data from working
        cell_line_data = self.storage.get(working_filename, "working")
        if not cell_line_data:
            raise FileNotFoundError(f"Could not read data from {working_filename}")
        
        try:
            # Create versioned file in ready
            self.storage.create(versioned_filename, cell_line_data["data"], "ready")
            
            # Remove original working file
            self.storage.delete(working_filename, "working")
            
            logger.info(f"Moved {working_filename} to ready as {versioned_filename}")
            
            return {
                "status": "success",
                "version": next_version,
                "filename": versioned_filename,
                "message": f"Cell line moved to ready as version {next_version}"
            }
            
        except Exception as e:
            logger.error(f"Error moving {working_filename} to ready with versioning: {e}")
            # Re-raise to let caller handle appropriately
            raise
    
    def move_to_working(self, ready_filename: str) -> Dict[str, Any]:
        """Move file from ready back to working directory.
        
        This method handles the reverse operation of moving files from ready status back
        to working directory for further editing. This is typically used when users want
        to modify a published cell line record.
        
        The operation is simpler than move_to_ready_with_versioning since no versioning
        logic is required - the file retains its current name and version information.
        
        Args:
            ready_filename (str): Name of the file in ready directory to move.
                Should include version suffix if applicable (e.g., 'TestCell001_v1').
                
        Returns:
            Dict[str, Any]: Operation result dictionary containing:
                - status (str): "success" if operation completed successfully
                - filename (str): Name of the file (unchanged from input)
                - new_location (str): "working" to indicate destination
                - message (str): Human-readable success message
                
        Raises:
            FileNotFoundError: If the specified file doesn't exist in ready directory,
                or if file data cannot be read from storage.
            ValueError: If a file with the same name already exists in working directory.
                This prevents accidental overwrites of working files.
            Exception: For any storage operation failures during the move process.
                The original exception is re-raised to preserve error details.
                
        Example:
            >>> dt = DataTransport(storage, version_control)
            >>> result = dt.move_to_working("TestCell001_v1")
            >>> print(f"Moved to {result['new_location']}: {result['filename']}")
            'Moved to working: TestCell001_v1'
        """
        # Check if file exists in ready directory
        if not self.storage.exists(ready_filename, "ready"):
            raise FileNotFoundError(f"File '{ready_filename}' not found in ready directory")
        
        # Check if file already exists in working directory
        if self.storage.exists(ready_filename, "working"):
            raise ValueError(f"File '{ready_filename}' already exists in working directory")
        
        try:
            # Get data from ready
            cell_line_data = self.storage.get(ready_filename, "ready")
            if not cell_line_data:
                raise FileNotFoundError(f"Could not read data from {ready_filename}")
            
            # Create in working
            self.storage.create(ready_filename, cell_line_data["data"], "working")
            
            # Delete from ready
            self.storage.delete(ready_filename, "ready")
            
            logger.info(f"Moved {ready_filename} from ready to working")
            
            return {
                "status": "success",
                "filename": ready_filename,
                "new_location": "working",
                "message": f"File '{ready_filename}' moved to working directory"
            }
            
        except Exception as e:
            logger.error(f"Error moving {ready_filename} to working: {e}")
            # Re-raise to let caller handle appropriately
            raise