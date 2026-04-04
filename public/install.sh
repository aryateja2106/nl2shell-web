#!/bin/bash
set -e

echo "==> Installing NL2Shell..."
echo ""

# Check for Ollama
if ! command -v ollama &>/dev/null; then
  echo "==> Ollama not found. Installing..."
  INSTALL_SCRIPT=$(mktemp)
  curl -fsSL https://ollama.com/install.sh -o "$INSTALL_SCRIPT"
  sh "$INSTALL_SCRIPT"
  rm -f "$INSTALL_SCRIPT"
  echo ""
fi

# Pull the NL2Shell model (~400MB)
echo "==> Pulling NL2Shell model (400MB, one-time download)..."
if ! ollama pull hf.co/AryaYT/nl2shell-0.8b; then
  echo "Error: Failed to pull model." >&2
  exit 1
fi

echo ""
echo "NL2Shell installed!"
echo ""
echo "Usage:"
echo "  ollama run hf.co/AryaYT/nl2shell-0.8b"
echo ""
echo "Or try the web interface: https://nl2shell.com"
echo ""
