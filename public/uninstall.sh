#!/bin/bash
set -e

echo "==> Removing NL2Shell model..."

if command -v ollama &>/dev/null; then
  ollama rm hf.co/AryaYT/nl2shell-0.8b 2>/dev/null && echo "Model removed." || echo "Model not found (already removed)."
else
  echo "Ollama not installed. Nothing to remove."
fi

echo ""
echo "NL2Shell uninstalled. Ollama itself was not removed."
echo "To remove Ollama: https://ollama.com/docs/uninstall"
echo ""
