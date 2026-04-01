#!/bin/bash
set -e

echo "==> Installing NL2Shell..."
echo ""

# Check for Ollama
if ! command -v ollama &>/dev/null; then
  echo "==> Ollama not found. Installing..."
  curl -fsSL https://ollama.com/install.sh | sh
  echo ""
fi

# Pull the NL2Shell model (~400MB)
echo "==> Pulling NL2Shell model (400MB, one-time download)..."
ollama pull hf.co/AryaYT/nl2shell-0.8b

echo ""
echo "NL2Shell installed!"
echo ""
echo "Usage:"
echo "  ollama run hf.co/AryaYT/nl2shell-0.8b"
echo ""
echo "Or try the web interface: https://nl2shell.com"
echo ""
