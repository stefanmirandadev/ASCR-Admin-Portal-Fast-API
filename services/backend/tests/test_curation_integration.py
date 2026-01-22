"""
Integration test for the AI curation pipeline.

Runs the full curation flow through the /start-ai-curation endpoint.
Requires: Backend, Celery worker, and Redis to be running.

Run with: pytest tests/test_curation_integration.py -v -s
The -s flag shows print output in console.
"""

import pytest
import httpx
import asyncio
import base64
import json
import websockets
from pathlib import Path

# Test configuration
# Use 'backend' hostname when running inside Docker, 'localhost' otherwise
import os
BACKEND_HOST = os.getenv("BACKEND_HOST", "backend")  # Default to Docker service name
BACKEND_PORT = os.getenv("BACKEND_PORT", "8001")
BACKEND_URL = f"http://{BACKEND_HOST}:{BACKEND_PORT}"
WS_URL = f"ws://{BACKEND_HOST}:{BACKEND_PORT}/ws/task-updates"
FIXTURES_DIR = Path(__file__).parent / "fixtures"
TEST_PDF = FIXTURES_DIR / "single_cell_line_scr_article.pdf"

# Timeout for waiting on curation completion (seconds)
CURATION_TIMEOUT = 300  # 5 minutes - AI curation can take a while


class TestCurationIntegration:
    """Integration tests for the full AI curation pipeline."""

    @pytest.mark.asyncio
    async def test_single_cell_line_curation(self):
        """
        Test curation of a single cell line article.

        Submits a PDF to /start-ai-curation, waits for completion via WebSocket,
        and prints the curated cell line form.
        """
        # Verify test PDF exists
        assert TEST_PDF.exists(), f"Test PDF not found: {TEST_PDF}"

        # Read and base64 encode the PDF
        pdf_bytes = TEST_PDF.read_bytes()
        pdf_base64 = base64.b64encode(pdf_bytes).decode("utf-8")

        print(f"\n{'='*60}")
        print(f"Starting curation test with: {TEST_PDF.name}")
        print(f"PDF size: {len(pdf_bytes) / 1024:.1f} KB")
        print(f"{'='*60}\n")

        # Prepare request payload
        payload = {
            "files": [
                {
                    "filename": TEST_PDF.name,
                    "file_data": pdf_base64
                }
            ]
        }

        # Connect to WebSocket first to catch the completion event
        async with websockets.connect(WS_URL) as ws:
            print("Connected to WebSocket for task updates...")

            # Submit curation request
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{BACKEND_URL}/start-ai-curation",
                    json=payload
                )

            # Verify endpoint accepted the request
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

            queue_result = response.json()
            print(f"Curation queued successfully:")
            print(json.dumps(queue_result, indent=2))
            print(f"\nWaiting for curation to complete (timeout: {CURATION_TIMEOUT}s)...\n")

            # Wait for task completion via WebSocket
            try:
                message = await asyncio.wait_for(
                    ws.recv(),
                    timeout=CURATION_TIMEOUT
                )

                result = json.loads(message)

                print(f"{'='*60}")
                print("CURATION COMPLETED")
                print(f"{'='*60}\n")

                # Print the full result
                print(json.dumps(result, indent=2))

                # Verify we got a result
                assert result.get("type") == "task_completed", f"Unexpected message type: {result.get('type')}"
                assert result.get("filename") == TEST_PDF.name

                # Check for success
                curation_result = result.get("result", {})
                assert curation_result.get("status") == "success", f"Curation failed: {curation_result.get('error')}"

                # Verify single cell line was found
                cell_lines_found = curation_result.get("cell_lines_found", 0)
                print(f"\nCell lines found: {cell_lines_found}")
                assert cell_lines_found == 1, f"Expected 1 cell line, found {cell_lines_found}"

                print(f"\n{'='*60}")
                print("TEST PASSED")
                print(f"{'='*60}")

            except asyncio.TimeoutError:
                pytest.fail(f"Curation did not complete within {CURATION_TIMEOUT} seconds")


@pytest.mark.asyncio
async def test_backend_health():
    """Quick health check to verify backend is running."""
    async with httpx.AsyncClient(timeout=5.0) as client:
        response = await client.get(f"{BACKEND_URL}/health")

    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
    print("Backend health check passed")
