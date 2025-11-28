import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ErrorModal } from '../components/ErrorModal';

describe('ErrorModal', () => {
  const mockErrorDetails = {
    article_id: 1,
    error_message: 'OpenAI API key is invalid',
    curation_status: 'failed',
    failed_at: '2025-01-01T00:00:00Z',
    filename: 'test.pdf',
    pubmed_id: 12345
  };

  test('displays error details correctly', () => {
    render(
      <ErrorModal
        isOpen={true}
        onClose={jest.fn()}
        errorDetails={mockErrorDetails}
      />
    );

    expect(screen.getByText('Curation Error Details')).toBeInTheDocument();
    expect(screen.getByText('Article ID:')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('OpenAI API key is invalid')).toBeInTheDocument();
  });

  test('categorizes errors correctly', () => {
    render(
      <ErrorModal
        isOpen={true}
        onClose={jest.fn()}
        errorDetails={mockErrorDetails}
      />
    );

    expect(screen.getByText('Error Category')).toBeInTheDocument();
    expect(screen.getByText('OpenAI API Error')).toBeInTheDocument();
  });

  test('shows loading state', () => {
    render(
      <ErrorModal
        isOpen={true}
        onClose={jest.fn()}
        errorDetails={null}
        loading={true}
      />
    );

    expect(screen.getByText('Loading error details...')).toBeInTheDocument();
  });

  test('calls onClose when close button is clicked', () => {
    const onClose = jest.fn();
    render(
      <ErrorModal
        isOpen={true}
        onClose={onClose}
        errorDetails={mockErrorDetails}
      />
    );

    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });

  test('displays troubleshooting tips', () => {
    render(
      <ErrorModal
        isOpen={true}
        onClose={jest.fn()}
        errorDetails={mockErrorDetails}
      />
    );

    expect(screen.getByText('Troubleshooting Tips')).toBeInTheDocument();
    expect(screen.getByText(/Check if the article content is properly formatted/)).toBeInTheDocument();
  });
}); 