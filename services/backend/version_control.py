from typing import Dict, Any, List, Optional
import logging

logger = logging.getLogger(__name__)


class VersionControl:
    """Pure versioning logic with no file operations.
    
    Handles all version-related operations including version number calculation, version parsing
    from filenames, finding latest versions, and base name extraction. This class follows the
    Single Responsibility Principle by focusing solely on versioning logic while delegating
    all file operations to the StorageInterface.
    
    The versioning system uses a semantic approach with _v{number} suffixes (e.g., TestCell001_v0,
    TestCell001_v1) and maintains version history in the ready directory.
    
    Attributes:
        storage: StorageInterface instance for file operations.
        
    Example:
        Basic usage:
        
        >>> from storage import FileStorage
        >>> storage = FileStorage()
        >>> vc = VersionControl(storage)
        >>> next_version = vc.get_next_version("TestCell001", ["TestCell001_v0", "TestCell001_v1"])
        >>> print(next_version)
        2
    """
    
    def __init__(self, storage):
        """Initialize VersionControl with storage dependency.
        
        Args:
            storage: StorageInterface implementation for file operations. Must implement
                all required storage methods for file management.
        """
        self.storage = storage
    
    def get_next_version(self, base_name: str, existing_files: List[str]) -> int:
        """Calculate the next version number given a list of existing files.
        
        Analyzes existing version filenames to determine the next sequential version number.
        Version numbers start at 0 for new cell lines and increment by 1 for each new version.
        
        Args:
            base_name (str): Base name of the cell line (e.g., "TestCell001").
            existing_files (List[str]): List of existing filenames with version suffixes.
                Expected format: ["TestCell001_v0", "TestCell001_v1", ...]
            
        Returns:
            int: Next version number. Returns 0 if no existing files, otherwise max + 1.
                
        Example:
            >>> vc = VersionControl(storage)
            >>> next_ver = vc.get_next_version("TEST001", ["TEST001_v0", "TEST001_v2"])
            >>> print(next_ver)
            3
        """
        if not existing_files:
            return 0
        
        # Extract version numbers from filenames
        version_numbers = []
        for filename in existing_files:
            version = self.parse_version_from_filename(filename)
            if version is not None:
                version_numbers.append(version)
        
        # Return next version (highest + 1, or 0 if no valid versions found)
        if version_numbers:
            return max(version_numbers) + 1
        else:
            return 0
    
    def parse_version_from_filename(self, filename: str) -> Optional[int]:
        """Extract version number from filename like 'TestCell001_v2'.
        
        Parses filenames with version suffixes to extract the numeric version number.
        Version suffixes must follow the format '_v{number}' where number is a non-negative integer.
        
        Args:
            filename (str): Filename to parse for version information.
                Expected format: 'BaseName_v{number}' (e.g., 'TestCell001_v2').
            
        Returns:
            Optional[int]: Version number if found and valid, None otherwise.
                Returns None for filenames without '_v' suffix or invalid version numbers.
                
        Example:
            >>> vc = VersionControl(storage)
            >>> version = vc.parse_version_from_filename("TestCell001_v2")
            >>> print(version)
            2
            >>> version = vc.parse_version_from_filename("TestCell001")
            >>> print(version)
            None
        """
        if "_v" not in filename:
            return None
            
        try:
            # Extract number after "_v"
            version_part = filename.split("_v")[-1]
            return int(version_part)
        except (ValueError, IndexError):
            return None
    
    def create_versioned_filename(self, base_name: str, version: int) -> str:
        """Create versioned filename like 'TestCell001_v2'.
        
        Constructs a filename with version suffix using the standard versioning format.
        This method ensures consistent filename formatting across the system.
        
        Args:
            base_name (str): Base name of the cell line without any suffixes.
                Should be the clean cell line identifier (e.g., 'TestCell001').
            version (int): Version number to append. Must be non-negative.
                Version numbers start at 0 for the first version.
            
        Returns:
            str: Versioned filename in format '{base_name}_v{version}'.
                
        Example:
            >>> vc = VersionControl(storage)
            >>> filename = vc.create_versioned_filename("TestCell001", 2)
            >>> print(filename)
            'TestCell001_v2'
        """
        return f"{base_name}_v{version}"
    
    def extract_base_name(self, filename: str) -> str:
        """Extract base name from filename (remove _working, _v0 suffixes).
        
        Normalizes filenames by removing version and working directory suffixes to get the
        clean base name. This is essential for grouping related files and version management.
        
        Args:
            filename (str): Filename to extract base name from. Can contain '_working'
                or version suffixes like '_v0', '_v1', etc.
                
        Returns:
            str: Clean base name without any suffixes. This represents the core
                cell line identifier that remains constant across versions.
                
        Example:
            >>> vc = VersionControl(storage)
            >>> base = vc.extract_base_name("TestCell001_working")
            >>> print(base)
            'TestCell001'
            >>> base = vc.extract_base_name("TestCell001_v2")
            >>> print(base)
            'TestCell001'
        """
        base_name = filename
        if "_working" in filename:
            base_name = filename.replace("_working", "")
        elif "_v" in filename:
            base_name = filename.split("_v")[0]
        return base_name
    
    def get_latest_version(self, existing_files: List[str]) -> Optional[str]:
        """Find filename with highest version number.
        
        Analyzes a list of filenames to identify which one represents the most recent
        version based on version number parsing. Only considers files with valid version suffixes.
        
        Args:
            existing_files (List[str]): List of filenames to search through.
                Files should follow the versioning format '{base_name}_v{number}'.
                
        Returns:
            Optional[str]: Filename with the highest version number if any valid versions
                are found, None if no files have valid version suffixes.
                
        Example:
            >>> vc = VersionControl(storage)
            >>> files = ["TestCell001_v0", "TestCell001_v2", "TestCell001_v1"]
            >>> latest = vc.get_latest_version(files)
            >>> print(latest)
            'TestCell001_v2'
        """
        if not existing_files:
            return None
        
        latest_version_num = -1
        latest_filename = None
        
        for filename in existing_files:
            version = self.parse_version_from_filename(filename)
            if version is not None and version > latest_version_num:
                latest_version_num = version
                latest_filename = filename
        
        return latest_filename
    
    def get_all_versions(self, base_name: str) -> List[str]:
        """Get all versions for a base name (delegates to storage).
        
        Retrieves all version files associated with a specific cell line base name from
        the ready directory. This method delegates to the storage interface for file retrieval.
        
        Args:
            base_name (str): Base name to search for (e.g., 'TestCell001').
                This should be the clean base name without any suffixes.
            
        Returns:
            List[str]: List of version filenames for the specified base name.
                Filenames will follow the format '{base_name}_v{number}'.
                Returns empty list if no versions found.
                
        Example:
            >>> vc = VersionControl(storage)
            >>> versions = vc.get_all_versions("TestCell001")
            >>> print(versions)
            ['TestCell001_v0', 'TestCell001_v1', 'TestCell001_v2']
        """
        return self.storage.get_files_for_base_name(base_name, "ready")
    
    def get_latest_version_data(self, base_name: str) -> Dict[str, Any]:
        """Get data for the latest version of a cell line.
        
        Retrieves the complete data for the most recent version of a cell line, including
        both the metadata and the actual cell line data. This is a high-level convenience
        method that combines version lookup with data retrieval.
        
        Args:
            base_name (str): Base name to get latest version for (e.g., 'TestCell001').
                This should be the clean base name without any suffixes.
            
        Returns:
            Dict[str, Any]: Dictionary containing complete version information:
                - base_name (str): The original base name provided
                - latest_version (int): Version number of the latest version
                - filename (str): Filename of the latest version file
                - data (Dict[str, Any]): The actual cell line data from the file
                
        Raises:
            FileNotFoundError: If no versions found for the specified base name,
                or if the latest version file cannot be read from storage.
                
        Example:
            >>> vc = VersionControl(storage)
            >>> latest_data = vc.get_latest_version_data("TestCell001")
            >>> print(f"Version {latest_data['latest_version']} in {latest_data['filename']}")
            'Version 2 in TestCell001_v2'
        """
        # Get all versions from storage
        existing_files = self.get_all_versions(base_name)
        
        if not existing_files:
            raise FileNotFoundError(f"No versions found for cell line '{base_name}'")
        
        # Find latest version
        latest_filename = self.get_latest_version(existing_files)
        if not latest_filename:
            raise FileNotFoundError(f"No valid versions found for cell line '{base_name}'")
        
        # Parse version number
        latest_version_num = self.parse_version_from_filename(latest_filename)
        
        # Get data from storage
        cell_line_data = self.storage.get(latest_filename, "ready")
        if not cell_line_data:
            raise FileNotFoundError(f"Latest version file '{latest_filename}' not found")
        
        return {
            "base_name": base_name,
            "latest_version": latest_version_num,
            "filename": latest_filename,
            "data": cell_line_data["data"]
        }