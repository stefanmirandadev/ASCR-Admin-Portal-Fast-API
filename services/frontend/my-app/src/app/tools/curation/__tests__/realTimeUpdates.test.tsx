import { render, screen, waitFor, act } from '@testing-library/react';
import CurationPage from '../page';

// Mock the API calls
global.fetch = jest.fn();

describe('Real-time Updates', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('starts polling when curation is initiated', async () => {
    const mockArticles = [
      { 
        id: 1, 
        filename: 'test1.pdf', 
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
        filename: 'test2.pdf', 
        curation_status: 'processing',
        pubmed_id: null,
        created_on: '2025-01-01T00:00:00Z',
        modified_on: '2025-01-01T00:00:00Z',
        curation_error: null,
        curation_started_at: '2025-01-01T00:00:00Z',
        transcription_status: 'completed',
        is_curated: false,
        approximate_tokens: 1000
      }
    ];

    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ articles: mockArticles })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'queued', task_id: 'test-task-id' })
      })
      .mockResolvedValue({
        ok: true,
        json: async () => ({ 
          articles: mockArticles,
          total_count: 2,
          processing_count: 1,
          completed_count: 0,
          failed_count: 0
        })
      });

    render(<CurationPage />);
    
    await waitFor(() => {
      expect(screen.getByText('test1.pdf')).toBeInTheDocument();
    });

    // Start curation
    const checkbox = screen.getAllByRole('checkbox')[1];
    checkbox.click();
    
    const startButton = screen.getByText('Start Curation');
    startButton.click();
    
    const confirmButton = screen.getByText('Confirm');
    confirmButton.click();

    // Verify polling starts
    await waitFor(() => {
      expect(screen.getByText('Live status updates active')).toBeInTheDocument();
    });

    // Advance timers to trigger polling
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/curation/status/', expect.any(Object));
    });
  });

  test('stops polling when all processing is complete', async () => {
    const mockArticles = [
      { 
        id: 1, 
        filename: 'test1.pdf', 
        curation_status: 'completed',
        pubmed_id: null,
        created_on: '2025-01-01T00:00:00Z',
        modified_on: '2025-01-01T00:00:00Z',
        curation_error: null,
        curation_started_at: '2025-01-01T00:00:00Z',
        transcription_status: 'completed',
        is_curated: true,
        approximate_tokens: 1000
      }
    ];

    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ articles: mockArticles })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'queued', task_id: 'test-task-id' })
      })
      .mockResolvedValue({
        ok: true,
        json: async () => ({ 
          articles: mockArticles,
          total_count: 1,
          processing_count: 0,
          completed_count: 1,
          failed_count: 0
        })
      });

    render(<CurationPage />);
    
    await waitFor(() => {
      expect(screen.getByText('test1.pdf')).toBeInTheDocument();
    });

    // Start curation
    const checkbox = screen.getAllByRole('checkbox')[1];
    checkbox.click();
    
    const startButton = screen.getByText('Start Curation');
    startButton.click();
    
    const confirmButton = screen.getByText('Confirm');
    confirmButton.click();

    // Verify polling starts
    await waitFor(() => {
      expect(screen.getByText('Live status updates active')).toBeInTheDocument();
    });

    // Advance timers to trigger polling and completion
    act(() => {
      jest.advanceTimersByTime(8000); // 5 seconds for completion + 3 for polling
    });

    // Verify polling stops
    await waitFor(() => {
      expect(screen.queryByText('Live status updates active')).not.toBeInTheDocument();
    });
  });

  test('displays status dashboard with counts', async () => {
    const mockArticles = [
      { 
        id: 1, 
        filename: 'test1.pdf', 
        curation_status: 'processing',
        pubmed_id: null,
        created_on: '2025-01-01T00:00:00Z',
        modified_on: '2025-01-01T00:00:00Z',
        curation_error: null,
        curation_started_at: '2025-01-01T00:00:00Z',
        transcription_status: 'completed',
        is_curated: false,
        approximate_tokens: 1000
      }
    ];

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ 
        articles: mockArticles,
        total_count: 1,
        processing_count: 1,
        completed_count: 0,
        failed_count: 0
      })
    });

    render(<CurationPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Total Articles')).toBeInTheDocument();
      expect(screen.getByText('Processing')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });
  });
}); 