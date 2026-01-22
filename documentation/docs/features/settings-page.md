# Settings Page Feature Specification

## Overview

The Settings Page provides a user interface for managing application configuration at runtime. It allows users to configure API keys and other settings through the web UI, which are persisted to disk and take precedence over environment variables.

## Functional Description

### Purpose
- Provide centralized configuration management for the ASCR Admin Portal
- Allow runtime updates to application settings without requiring service restarts
- Securely store and manage sensitive credentials (API keys)
- Support both UI-based and environment-based configuration

### Key Features
1. **API Key Management**: Securely configure OpenAI API keys for AI-powered curation
2. **Configuration Hierarchy**: Runtime config (UI) takes precedence over environment variables
3. **Security**: API keys are masked in responses and stored in a local config file
4. **Real-time Updates**: Settings changes take effect immediately without service restart
5. **Fallback Support**: Automatic fallback to environment variables if runtime config not set

### User Workflow
1. User navigates to Settings page via sidebar
2. Existing settings are loaded and displayed (API keys masked)
3. User enters or updates configuration values
4. User clicks "Save Settings"
5. Settings are validated and persisted to `config.json`
6. Success/error feedback displayed to user
7. New settings are immediately available to the application

## Architecture

### Frontend Component
**Location**: `services/frontend/my-app/src/app/settings/page.tsx`

**Responsibilities**:
- Render settings form with centered, readable layout (680px max-width)
- Fetch current settings from backend on page load
- Display masked API keys for security
- Handle form submission and validation
- Show success/error alerts
- Indicate when environment variables are being used

**Key States**:
- `apiKey`: Current API key value (user input)
- `isApiKeySet`: Whether API key exists (either runtime or env)
- `apiKeySource`: Where the key comes from ("environment" or null for runtime)
- `isLoading`: Initial settings fetch in progress
- `isSaving`: Settings save operation in progress
- `saveSuccess/saveError`: Feedback messages

### Backend Module
**Location**: `services/backend/config_manager.py`

**Class**: `ConfigManager`

**Responsibilities**:
- Load configuration from `config.json` file
- Save configuration changes to disk
- Implement configuration priority system
- Provide secure access to settings (mask API keys)
- Handle fallback to environment variables

**Key Methods**:
- `get(key, default)`: Retrieve config value (runtime → env → default)
- `set(key, value)`: Update single config value in runtime config
- `get_all_settings()`: Return all user-configurable settings (masks API keys)
- `update_settings(settings)`: Update multiple settings atomically

**Configuration Priority** (highest to lowest):
1. Runtime config file (`config.json`) - user settings from UI
2. Environment variables (`.env`) - default/dev settings

### Configuration Storage
**Location**: `services/backend/config.json`

**Format**: JSON file with key-value pairs
```json
{
  "OPENAI_API_KEY": "sk-..."
}
```

**Notes**:
- Created automatically on first save
- Plain JSON storage (not encrypted)
- Should be added to `.gitignore` for security
- Persists across container restarts via volume mount

## API Endpoints

### GET /settings
**Service**: Backend (Port 8001)
**File**: `services/backend/main.py:303`

**Purpose**: Retrieve all user-configurable settings

**Request**: None (GET request)

**Response**:
```json
{
  "settings": {
    "OPENAI_API_KEY": "***xyz",
    "OPENAI_API_KEY_SET": true,
    "OPENAI_API_KEY_SOURCE": "environment"
  }
}
```

**Response Fields**:
- `OPENAI_API_KEY`: Masked API key (only last 4 chars visible)
- `OPENAI_API_KEY_SET`: Boolean indicating if key exists
- `OPENAI_API_KEY_SOURCE`: "environment" if from env vars, omitted if from runtime config

**Error Responses**:
- `500`: Internal server error (config file read error, etc.)

### POST /settings
**Service**: Backend (Port 8001)
**File**: `services/backend/main.py:316`

**Purpose**: Update application settings

**Request**:
```json
{
  "OPENAI_API_KEY": "sk-new-key-value"
}
```

**Notes**:
- Only non-empty values are updated
- Set value to `null` or `""` to skip updating that field
- Masked values (starting with `***`) are ignored

**Response**:
```json
{
  "status": "success",
  "message": "Settings updated successfully"
}
```

**Error Responses**:
- `400`: Invalid request format
- `500`: Failed to save settings (disk write error, etc.)

## Key Modules & Files

### Frontend
| File | Purpose |
|------|---------|
| `services/frontend/my-app/src/app/settings/page.tsx` | Settings page component |

### Backend
| File | Purpose |
|------|---------|
| `services/backend/config_manager.py` | Configuration management logic |
| `services/backend/main.py` | Settings API endpoints |
| `services/backend/config.json` | Runtime configuration storage |

### Integration Points
- **Curation Service**: Uses `config_manager.get("OPENAI_API_KEY")` to retrieve API key for OpenAI API calls
- **Any Service**: Can use `ConfigManager` to retrieve any configuration value with automatic fallback to environment variables

## Security Considerations

### Current Implementation
1. **API Key Masking**: Keys shown as `***xyz` in GET responses
2. **Local Storage**: Config stored in `config.json` on server filesystem
3. **CORS Protection**: Frontend restricted to `localhost:3001`
4. **No Logging**: API keys never logged in application logs

### Limitations
1. **No Encryption**: `config.json` stores keys in plain text
2. **No Access Control**: No authentication on settings endpoints
3. **Container Security**: Config file accessible to anyone with container access

### Recommendations for Production
1. Implement authentication/authorization on settings endpoints
2. Consider using environment variables only for production
3. Use secrets management service (AWS Secrets Manager, HashiCorp Vault)
4. Add audit logging for settings changes
5. Implement role-based access control (admin-only settings)

## Extension Guide

### Adding a New Setting

**1. Backend (config_manager.py)**
- No changes needed - ConfigManager is generic

**2. Frontend (settings/page.tsx)**
```typescript
// Add state
const [newSetting, setNewSetting] = useState('');

// Add to fetch
setNewSetting(settings.NEW_SETTING || '');

// Add to form
<TextField
  label="New Setting"
  value={newSetting}
  onChange={(e) => setNewSetting(e.target.value)}
/>

// Add to save
body: JSON.stringify({
  OPENAI_API_KEY: apiKey,
  NEW_SETTING: newSetting
})
```

**3. Use in Application**
```python
from config_manager import config_manager

value = config_manager.get("NEW_SETTING", "default_value")
```

### Adding Setting Categories
To organize settings into sections (e.g., "API Configuration", "Display Options"):

1. Group related settings in the UI with section headers and dividers
2. Keep backend config flat (no nested objects in config.json)
3. Use naming conventions for grouping (e.g., `API_*`, `DISPLAY_*`)

### Adding Setting Validation
Add validation logic in the backend endpoint:

```python
@app.post("/settings")
async def update_settings(settings: dict):
    # Validate API key format
    if "OPENAI_API_KEY" in settings:
        key = settings["OPENAI_API_KEY"]
        if key and not key.startswith("sk-"):
            raise HTTPException(400, "Invalid OpenAI API key format")

    config_manager.update_settings(settings)
    return {"status": "success"}
```

## Testing

### Manual Testing
1. Start services with `./start.sh`
2. Navigate to Settings page at `http://localhost:3001/settings`
3. Verify existing settings load correctly
4. Enter a new API key and save
5. Verify success message appears
6. Check `services/backend/config.json` was created/updated
7. Refresh page and verify settings persist

### Validation Points
- API key masking works correctly (only last 4 chars visible)
- Environment variable detection ("Currently using key from environment variables")
- Save button disabled when no changes made
- Success/error alerts display correctly
- Settings persist across page reloads
- Settings persist across container restarts (if volumes mounted)

### API Testing
```bash
# Get settings
curl http://localhost:8001/settings

# Update settings
curl -X POST http://localhost:8001/settings \
  -H "Content-Type: application/json" \
  -d '{"OPENAI_API_KEY": "sk-test-key"}'
```

## Future Enhancements

### Planned Features
1. **Multiple API Keys**: Support for Anthropic, Azure OpenAI, etc.
2. **Configuration Import/Export**: Backup and restore settings
3. **Setting Validation**: Real-time API key testing
4. **Audit Trail**: Log who changed what and when
5. **Environment Indicators**: Visual indicator for dev/staging/production

### Consideration for Scale
- **Multi-user Support**: Per-user settings vs global settings
- **Secrets Management**: Integration with external secrets services
- **Configuration Versioning**: Track changes over time
- **Setting Presets**: Quick configuration for common scenarios
