# MkDocs Documentation

This directory contains the MkDocs documentation setup for the ASCR Admin Portal backend.

## Quick Start

```bash
cd documentation
source docs-env/bin/activate  # Use your existing venv
pip install -r requirements.txt
mkdocs serve
```

Then open http://localhost:8000

## Commands

```bash
# Serve with live reload
mkdocs serve

# Build static site
mkdocs build

# Deploy to GitHub Pages (when ready)
mkdocs gh-deploy
```

## Features

- **Material Design** theme with dark/light mode toggle
- **Automatic API documentation** from your Google-style docstrings  
- **Live reload** during development
- **Search functionality**
- **Mobile responsive**
- **Code syntax highlighting**

The `mkdocstrings` plugin automatically generates beautiful API documentation from all your existing Google-style docstrings!