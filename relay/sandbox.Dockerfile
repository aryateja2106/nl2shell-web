FROM node:22-slim

# Security: run as non-root user
RUN groupadd -r agent && useradd -r -g agent -m -d /agent agent

# Install minimal tools the model might need for bash experiments
RUN apt-get update && apt-get install -y --no-install-recommends \
    bash \
    coreutils \
    curl \
    jq \
    git \
    python3 \
    python3-pip \
    bc \
    file \
    tree \
    procps \
    net-tools \
    && rm -rf /var/lib/apt/lists/*

# Create workspace and audit dirs
RUN mkdir -p /agent/workspace /agent/audit && chown -R agent:agent /agent

# Drop to non-root
USER agent
WORKDIR /agent/workspace

# Keep container alive — commands are injected via docker exec
ENTRYPOINT ["sleep", "infinity"]
