#!/bin/bash
# Test runner script for the entire project
# Runs tests from correct directories so imports work properly

set -e  # Exit on first failure

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
VENV_PYTHON="$PROJECT_ROOT/.venv/bin/python"

echo "========================================="
echo "Running Data Dictionaries Tests"
echo "========================================="
cd "$PROJECT_ROOT/data_dictionaries"
$VENV_PYTHON -m pytest -v

echo ""
echo "========================================="
echo "Running Backend Tests (via Docker)"
echo "========================================="
cd "$PROJECT_ROOT"
docker-compose exec -T curation_service pytest /app/tests -v

echo ""
echo "========================================="
echo "All tests completed!"
echo "========================================="
