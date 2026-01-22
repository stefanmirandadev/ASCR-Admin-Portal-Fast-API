import os
import json
from pathlib import Path
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

class ConfigManager:
    """
    Manages application configuration with runtime updates.

    Priority (highest to lowest):
    1. Runtime config file (config.json) - user settings from UI
    2. Environment variables (.env) - default/dev settings
    """

    def __init__(self, config_file: str = "config.json"):
        self.config_file = Path(__file__).parent / config_file
        self._config_cache: Optional[Dict[str, Any]] = None

    def _load_runtime_config(self) -> Dict[str, Any]:
        """Load configuration from config.json file"""
        if self.config_file.exists():
            try:
                with open(self.config_file, 'r') as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError) as e:
                logger.error(f"Error loading config file: {e}")
                return {}
        return {}

    def _save_runtime_config(self, config: Dict[str, Any]) -> None:
        """Save configuration to config.json file"""
        try:
            with open(self.config_file, 'w') as f:
                json.dump(config, f, indent=2)
            logger.info("Configuration saved successfully")
        except IOError as e:
            logger.error(f"Error saving config file: {e}")
            raise

    def get(self, key: str, default: Any = None) -> Any:
        """
        Get a configuration value.
        Checks runtime config first, then falls back to environment variables.
        """
        # Check runtime config
        runtime_config = self._load_runtime_config()
        if key in runtime_config:
            return runtime_config[key]

        # Fall back to environment variable
        return os.getenv(key, default)

    def set(self, key: str, value: Any) -> None:
        """
        Set a configuration value in the runtime config file.
        """
        runtime_config = self._load_runtime_config()
        runtime_config[key] = value
        self._save_runtime_config(runtime_config)

        # Clear cache
        self._config_cache = None

    def get_all_settings(self) -> Dict[str, Any]:
        """
        Get all user-configurable settings (from runtime config only).
        Returns full API keys since app runs on private network.
        """
        runtime_config = self._load_runtime_config()

        # Return user-configurable settings with full values
        settings = {}
        for key, value in runtime_config.items():
            settings[key] = value
            if key.endswith("_API_KEY") and value:
                settings[f"{key}_SET"] = True

        # Check if API key exists in env (fallback)
        if "OPENAI_API_KEY" not in runtime_config:
            env_key = os.getenv("OPENAI_API_KEY")
            if env_key:
                settings["OPENAI_API_KEY"] = env_key
                settings["OPENAI_API_KEY_SET"] = True
                settings["OPENAI_API_KEY_SOURCE"] = "environment"
            else:
                settings["OPENAI_API_KEY_SET"] = False

        return settings

    def update_settings(self, settings: Dict[str, Any]) -> None:
        """
        Update multiple settings at once.
        Only updates non-empty values.
        """
        runtime_config = self._load_runtime_config()

        for key, value in settings.items():
            if value is not None and value != "":
                runtime_config[key] = value

        self._save_runtime_config(runtime_config)
        self._config_cache = None

# Global instance
config_manager = ConfigManager()
