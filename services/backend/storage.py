from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from pathlib import Path
from datetime import datetime, date
import json
import logging

logger = logging.getLogger(__name__)


def _json_serializer(obj):
    """Custom JSON serializer for date/datetime objects"""
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")


class StorageInterface(ABC):
    """Abstract interface for pure CRUD operations and index management.
    
    This interface defines only file storage operations with no business logic like versioning.
    Versioning logic is handled by the separate VersionControl class, following the Single
    Responsibility Principle.
    
    All storage implementations must inherit from this interface to ensure consistent
    behavior across different storage backends (file system, S3, database, etc.).
    
    Example:
        Creating a new storage implementation:
        
        >>> class S3Storage(StorageInterface):
        ...     def create(self, filename, data, location="working"):
        ...         # S3-specific implementation
        ...         pass
    """
    
    @abstractmethod
    def create(self, filename: str, data: Dict[str, Any], location: str = "working") -> Dict[str, Any]:
        """Create a new file in the specified location.
        
        Args:
            filename (str): Name of the file to create (without extension).
            data (Dict[str, Any]): Cell line data dictionary containing required fields.
            location (str, optional): Directory location, either "working" or "ready".
                Defaults to "working".
            
        Returns:
            Dict[str, Any]: Response dictionary containing:
                - status (str): "success" if operation completed successfully
                - filename (str): Name of the created file
                - message (str): Human-readable success message
                
        Raises:
            ValueError: If data is invalid or missing required fields like hpscreg_name.
            FileExistsError: If file already exists in the specified location.
        """
        pass
    
    @abstractmethod
    def get(self, filename: str, location: str = "working") -> Optional[Dict]:
        """Retrieve a file from the specified location.
        
        Args:
            filename (str): Name of the file to retrieve (without extension).
            location (str, optional): Directory location, either "working" or "ready".
                Defaults to "working".
            
        Returns:
            Optional[Dict]: File data dictionary if found, None otherwise. When found, contains:
                - data (Dict[str, Any]): The actual cell line data
                - location (str): The location where file was found
                - filename (str): Name of the retrieved file
        """
        pass
    
    @abstractmethod
    def update(self, filename: str, data: Dict[str, Any], location: str = "working") -> Dict[str, Any]:
        """Update an existing file or create a new one in the specified location.
        
        Args:
            filename (str): Name of the file to update (without extension).
            data (Dict[str, Any]): Updated cell line data dictionary.
            location (str, optional): Directory location, either "working" or "ready".
                Defaults to "working".
            
        Returns:
            Dict[str, Any]: Response dictionary containing:
                - status (str): "success" if operation completed successfully
                - action (str): "created" if new file, "updated" if existing file modified
                - filename (str): Name of the affected file
                - message (str): Human-readable success message
        """
        pass
    
    @abstractmethod
    def delete(self, filename: str, location: str = "working") -> Dict[str, Any]:
        """Delete a file from the specified location.
        
        Args:
            filename (str): Name of the file to delete (without extension).
            location (str, optional): Directory location, either "working" or "ready".
                Defaults to "working".
            
        Returns:
            Dict[str, Any]: Response dictionary containing:
                - status (str): "success" if operation completed successfully
                - filename (str): Name of the deleted file
                - message (str): Human-readable success message
                
        Raises:
            FileNotFoundError: If the specified file doesn't exist in the location.
        """
        pass
    
    @abstractmethod
    def list_files(self, location: str = "working") -> List[str]:
        """
        List all files in specified location.
        
        Args:
            location: Directory location ("working" or "ready")
            
        Returns:
            List of filenames
        """
        pass
    
    @abstractmethod
    def exists(self, filename: str, location: str = "working") -> bool:
        """
        Check if file exists in specified location.
        
        Args:
            filename: Name of the file to check
            location: Directory location ("working" or "ready")
            
        Returns:
            True if file exists, False otherwise
        """
        pass
    
    @abstractmethod
    def get_files_for_base_name(self, base_name: str, location: str = "ready") -> List[str]:
        """
        Get all files matching a base name in specified location.
        Used by VersionControl to find existing versions.
        
        Args:
            base_name: Base name to search for (e.g. "TestCell001")
            location: Directory location ("working" or "ready")
            
        Returns:
            List of filenames that match the base name
        """
        pass


class FileStorage(StorageInterface):
    """File-based implementation of StorageInterface.
    
    Provides pure CRUD operations using the local file system for storage with JSON files
    and index management. This implementation follows the Single Responsibility Principle
    by handling only file operations and delegating versioning logic to VersionControl.
    
    The storage uses a directory-based approach with separate working and ready directories,
    and maintains index files for efficient file lookup and base name grouping.
    
    Attributes:
        Uses internal methods for file path management, directory creation, and JSON operations.
        All data is stored as JSON files with a corresponding index.json file per directory.
        
    Example:
        Basic usage:
        
        >>> storage = FileStorage()
        >>> data = {"cell_line": [{"hpscreg_name": "TEST001"}], "content": "test"}
        >>> result = storage.create("TEST001", data, "working")
        >>> print(result["status"])
        'success'
    """
    
    def __init__(self):
        """Initialize file-based storage.
        
        Sets up the FileStorage instance. No parameters required as all configuration
        is handled internally through directory structure and file naming conventions.
        """
        pass
    
    def _extract_hpscreg_name(self, data: Dict[str, Any]) -> str:
        """Extract hpscreg_name from cell line data"""
        # Try new structure (cell_line) first, fall back to legacy (basic_data)
        cell_line_data = data.get("cell_line", []) or data.get("basic_data", [])
        if not cell_line_data or not cell_line_data[0].get("hpscreg_name"):
            raise ValueError("Cannot save file without hpscreg_name")
        return cell_line_data[0]["hpscreg_name"]
    
    def _get_file_path(self, location: str, filename: str) -> Path:
        """Get file path for given location and filename"""
        return Path(f"data/{location}") / f"{filename}.json"
    
    def _get_index_path(self, location: str) -> Path:
        """Get index file path for given location"""
        return Path(f"data/{location}/index.json")
    
    def _ensure_directory_exists(self, location: str):
        """Ensure directory exists"""
        dir_path = Path(f"data/{location}")
        dir_path.mkdir(parents=True, exist_ok=True)
    
    def _load_index(self, location: str) -> Dict[str, List[str]]:
        """Load index file for given location (dict format)"""
        index_path = self._get_index_path(location)
        
        if not index_path.exists():
            self._ensure_directory_exists(location)
            with open(index_path, 'w') as f:
                json.dump({}, f)
            return {}
        
        try:
            with open(index_path, 'r') as f:
                index = json.load(f)
                if isinstance(index, dict):
                    return index
                else:
                    logger.warning(f"Converting old index format in {location} to new dict format")
                    return {}
        except (json.JSONDecodeError, FileNotFoundError):
            logger.warning(f"Invalid or missing {location} index.json, returning empty dict")
            return {}
    
    def _save_index(self, location: str, index: Dict[str, List[str]]):
        """Save index file for given location (dict format)"""
        self._ensure_directory_exists(location)
        index_path = self._get_index_path(location)
        
        with open(index_path, 'w', encoding='utf-8') as f:
            json.dump(index, f, indent=2, ensure_ascii=False)
    
    def _add_to_index(self, location: str, filename: str):
        """Add filename to location index (dict format with base name grouping)"""
        index = self._load_index(location)
        
        # Extract base name from filename (remove _working, _v0, etc. suffixes)
        base_name = self._extract_base_name_from_filename(filename)
        
        # Add to index
        if base_name not in index:
            index[base_name] = []
        
        if filename not in index[base_name]:
            index[base_name].append(filename)
            self._save_index(location, index)
            logger.info(f"Added {filename} to {location} index under {base_name}")
    
    def _extract_base_name_from_filename(self, filename: str) -> str:
        """Extract base name from filename (remove suffixes)"""
        base_name = filename
        if "_working" in filename:
            base_name = filename.replace("_working", "")
        elif "_v" in filename:
            base_name = filename.split("_v")[0]
        return base_name
    
    def _remove_from_index(self, location: str, filename: str):
        """Remove filename from location index"""
        index = self._load_index(location)
        
        # Find and remove filename from the appropriate base name list
        for base_name, filenames in index.items():
            if filename in filenames:
                filenames.remove(filename)
                # Remove base_name entry if no files left
                if not filenames:
                    del index[base_name]
                self._save_index(location, index)
                logger.info(f"Removed {filename} from {location} index")
                return
    
    def _save_json_file(self, filepath: Path, data: Dict[str, Any]):
        """Save data to JSON file with date serialization support"""
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False, default=_json_serializer)
    
    def create(self, filename: str, data: Dict[str, Any], location: str = "working") -> Dict[str, Any]:
        """Create file in specified location"""
        # Validate hpscreg_name exists (basic validation)
        self._extract_hpscreg_name(data)
        
        # Check if file already exists
        if self.exists(filename, location):
            raise FileExistsError(f"File '{filename}' already exists in {location} directory")
        
        # Ensure directory exists
        self._ensure_directory_exists(location)
        
        # Save the data to file
        filepath = self._get_file_path(location, filename)
        
        try:
            self._save_json_file(filepath, data)
            
            # Update index
            self._add_to_index(location, filename)
            
            logger.info(f"Created new file '{filename}' in {location}")
            return {
                "status": "success",
                "message": f"File '{filename}' created successfully in {location}",
                "filename": filename
            }
            
        except Exception as e:
            logger.error(f"Failed to create file '{filename}' in {location}: {e}")
            raise Exception(f"Failed to create file: {str(e)}")
    
    def get(self, filename: str, location: str = "working") -> Optional[Dict]:
        """Get file from specified location"""
        # Check if file exists in index
        if not self.exists(filename, location):
            return None
            
        # Try to read the file
        file_path = self._get_file_path(location, filename)
        if not file_path.exists():
            logger.error(f"File {filename} exists in index but not on disk in {location}")
            return None
            
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            # Get file's last modified time
            last_modified = datetime.fromtimestamp(file_path.stat().st_mtime)

            return {
                "data": data,
                "location": location,
                "filename": filename,
                "last_modified": last_modified.isoformat()
            }
        except (json.JSONDecodeError, FileNotFoundError) as e:
            logger.error(f"Error reading {location} file {filename}: {e}")
            return None
    
    def update(self, filename: str, data: Dict[str, Any], location: str = "working") -> Dict[str, Any]:
        """Update file in specified location"""
        # Basic validation
        self._extract_hpscreg_name(data)
        
        # Ensure directory exists
        self._ensure_directory_exists(location)
        
        # Save/overwrite the data to file
        filepath = self._get_file_path(location, filename)
        file_existed = filepath.exists() and self.exists(filename, location)
        
        try:
            self._save_json_file(filepath, data)
            
            # Update index if this is a new file
            if not file_existed:
                self._add_to_index(location, filename)
            
            action = "updated" if file_existed else "created"
            logger.info(f"Successfully {action} file '{filename}' in {location}")
            return {
                "status": "success",
                "message": f"File '{filename}' {action} successfully in {location}",
                "filename": filename,
                "action": action
            }
            
        except Exception as e:
            logger.error(f"Failed to update file '{filename}' in {location}: {e}")
            raise Exception(f"Failed to update file: {str(e)}")
    
    def delete(self, filename: str, location: str = "working") -> Dict[str, Any]:
        """Delete file from specified location"""
        # Check if file exists
        if not self.exists(filename, location):
            raise FileNotFoundError(f"File '{filename}' not found in {location} directory")
        
        # Get file path and remove file
        filepath = self._get_file_path(location, filename)
        
        try:
            filepath.unlink()  # Delete the file
            
            # Remove from index
            self._remove_from_index(location, filename)
            
            logger.info(f"Successfully deleted {filename} from {location}")
            return {
                "status": "success",
                "message": f"File '{filename}' deleted from {location} directory",
                "filename": filename
            }
            
        except Exception as e:
            logger.error(f"Failed to delete {filename} from {location}: {e}")
            raise Exception(f"Failed to delete file: {str(e)}")
    
    def list_files(self, location: str = "working") -> List[str]:
        """List all files in specified location"""
        index = self._load_index(location)
        
        # Flatten all filenames from all base names
        all_files = []
        for base_name, filenames in index.items():
            all_files.extend(filenames)
        return all_files
    
    def exists(self, filename: str, location: str = "working") -> bool:
        """Check if file exists in specified location"""
        index = self._load_index(location)
        
        # Check if filename exists in any of the version lists
        for base_name, filenames in index.items():
            if filename in filenames:
                return True
        return False
    
    def get_files_for_base_name(self, base_name: str, location: str = "ready") -> List[str]:
        """Get all files matching a base name in specified location"""
        index = self._load_index(location)
        if base_name in index:
            return index[base_name]
        return []