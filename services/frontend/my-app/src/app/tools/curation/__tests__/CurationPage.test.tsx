import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CurationPage from '../page';

// Mock the API calls
global.fetch = jest.fn();

describe('CurationPage', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  test('renders curation page with loading state', () => {
    render(<CurationPage />);
    expect(screen.getByText('Article Curation')).toBeInTheDocument();
    expect(screen.getByText('Select articles to curate using AI-assisted processing.')).toBeInTheDocument();
  });

  test('handles article selection correctly', async () => {
    const mockArticles = [
      { 
        id: 1, 
        filename: 'test1.pdf', 
        curation_status: 'pending',
        pubmed_id: 12345,
        created_on: '2025-01-01T00:00:00Z',
        modified_on: '2025-01-01T00:00:00Z',
        curation_error: null,
        curation_started_at: null,
        transcription_status: 'completed',
        is_curated: false,
        approximate_tokens: 1000
      },
      { 
        id: 2, 
        filename: 'test2.pdf', 
        curation_status: 'pending',
        pubmed_id: null,
        created_on: '2025-01-02T00:00:00Z',
        modified_on: '2025-01-02T00:00:00Z',
        curation_error: null,
        curation_started_at: null,
        transcription_status: 'completed',
        is_curated: false,
        approximate_tokens: 2000
      }
    ];

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ articles: mockArticles })
    });

    render(<CurationPage />);
    
    await waitFor(() => {
      expect(screen.getByText('test1.pdf')).toBeInTheDocument();
    });
    
    // Test selection logic
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); // Select first article
    
    expect(screen.getByText('1 of 2 selected')).toBeInTheDocument();
  });

  test('validates maximum selection limit', async () => {
    // Test with 21 articles to verify 20-item limit
    const mockArticles = Array.from({ length: 21 }, (_, i) => ({
      id: i + 1,
      filename: `test${i + 1}.pdf`,
      curation_status: 'pending',
      pubmed_id: null,
      created_on: '2025-01-01T00:00:00Z',
      modified_on: '2025-01-01T00:00:00Z',
      curation_error: null,
      curation_started_at: null,
      transcription_status: 'completed',
      is_curated: false,
      approximate_tokens: 1000
    }));

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ articles: mockArticles })
    });

    render(<CurationPage />);
    
    await waitFor(() => {
      expect(screen.getByText('test1.pdf')).toBeInTheDocument();
    });

    // Test that select all only selects first 20 articles
    const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(selectAllCheckbox);
    
    expect(screen.getByText('20 of 21 selected (max 20)')).toBeInTheDocument();
  });

  test('handles API errors gracefully', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(<CurationPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load articles')).toBeInTheDocument();
    });

    // Test retry functionality
    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);
    
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  test('displays different status indicators correctly', async () => {
    const mockArticles = [
      { 
        id: 1, 
        filename: 'pending.pdf', 
        curation_status: 'pending',
        pubmed_id: null,
        created_on: '2025-01-01T00:00:00Z',
        modified_on: '2025-01-01T00:00:00Z',
        curation_error: null,
        curation_started_at: null,
        transcription_status: 'completed',
        is_curated: false,
        approximate_tokens: 1000
      },
      { 
        id: 2, 
        filename: 'processing.pdf', 
        curation_status: 'processing',
        pubmed_id: null,
        created_on: '2025-01-01T00:00:00Z',
        modified_on: '2025-01-01T00:00:00Z',
        curation_error: null,
        curation_started_at: '2025-01-01T00:00:00Z',
        transcription_status: 'completed',
        is_curated: false,
        approximate_tokens: 1000
      },
      { 
        id: 3, 
        filename: 'completed.pdf', 
        curation_status: 'completed',
        pubmed_id: null,
        created_on: '2025-01-01T00:00:00Z',
        modified_on: '2025-01-01T00:00:00Z',
        curation_error: null,
        curation_started_at: '2025-01-01T00:00:00Z',
        transcription_status: 'completed',
        is_curated: true,
        approximate_tokens: 1000
      },
      { 
        id: 4, 
        filename: 'failed.pdf', 
        curation_status: 'failed',
        pubmed_id: null,
        created_on: '2025-01-01T00:00:00Z',
        modified_on: '2025-01-01T00:00:00Z',
        curation_error: 'Processing failed',
        curation_started_at: '2025-01-01T00:00:00Z',
        transcription_status: 'completed',
        is_curated: false,
        approximate_tokens: 1000
      }
    ];

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ articles: mockArticles })
    });

    render(<CurationPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.getByText('Processing')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });
  });

  test('displays empty state when no articles available', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ articles: [] })
    });

    render(<CurationPage />);
    
    await waitFor(() => {
      expect(screen.getByText('No articles available for curation.')).toBeInTheDocument();
    });
  });
}); 