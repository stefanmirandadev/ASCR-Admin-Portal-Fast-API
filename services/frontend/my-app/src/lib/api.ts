const isDev = process.env.NODE_ENV === 'development';

const API_BASE_URL = isDev
  ? 'http://localhost:8000'
  : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const API_ENDPOINTS = {
  // Curation endpoints
  CURATION: {
    BASE: `${API_BASE_URL}/api/curation`,
    ARTICLES: `${API_BASE_URL}/api/curation/articles/`,
    STATUS: `${API_BASE_URL}/api/curation/status/`,
    BULK_CURATE: `${API_BASE_URL}/api/curation/bulk_curate/`,
    ERROR_DETAILS: (articleId: number) => `${API_BASE_URL}/api/curation/${articleId}/error_details/`,
    RETRY: (articleId: number) => `${API_BASE_URL}/api/curation/${articleId}/retry/`,
    CELLLINES: (articleId: number) => `${API_BASE_URL}/api/curation/${articleId}/celllines/`,
    SAVE_CELLLINE: (celllineId: string) => `${API_BASE_URL}/api/curation/celllines/${celllineId}/`,
  },
  // Editor endpoints (for reference)
  EDITOR: {
    CELLLINES: `${API_BASE_URL}/api/editor/celllines/`,
    CELLLINE: (id: string) => `${API_BASE_URL}/api/editor/celllines/${id}/`,
    SCHEMA: `${API_BASE_URL}/api/editor/cellline-schema/`,
    NEW_TEMPLATE: `${API_BASE_URL}/api/editor/celllines/new_template/`,
    VERSIONS: (id: string) => `${API_BASE_URL}/api/editor/celllines/${id}/versions/`,
    VERSION: (id: string, version: string) => `${API_BASE_URL}/api/editor/celllines/${id}/versions/${version}/`,
  },
  // Transcription endpoints
  TRANSCRIPTION: {
    ARTICLES: `${API_BASE_URL}/api/articles/`,
    CREATE_ARTICLE: `${API_BASE_URL}/api/transcription/create_article/`,
  },
};

export default API_ENDPOINTS; 