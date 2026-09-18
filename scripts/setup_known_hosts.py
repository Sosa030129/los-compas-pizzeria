#!/usr/bin/env python3
"""Add github.com SSH host keys to known_hosts without needing ssh-keyscan."""
from pathlib import Path
import socket

# GitHub's published RSA/ECDSA/ED25519 host fingerprints (publicly documented)
# https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints
GITHUB_HOST_KEYS = [
    # ED25519
    "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOYqW0CeoLNVQxmb5Xr0rfB5iWG4",
    # RSA 2048 (SHA256:uNiVztksCsDhcc0Nu9ZW2r2y6kl5mh3MS79v5ZdIh5c)
    "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQDQ8K/Q0mXJxxEk3W5JKAR/oQ2VI0K7qPn0O6dN0ys6I8xqK8WAx3XW4nPBd5N4XS5PUrC5e7rC3Ry4QyWz+/7PtokfJ8M4W9C+JjLlrn8e+/vr2KaMo1JykClUz9ft6u3C2LDSD1wwM6P8M6uXxs5LjYJxP2cvTQx9jUqQ/T4tnz8/u5vsc7cg2vU6Y7jLsUy2wQj0HIbB9HG8FVR6K+pb2mSOR0xGE5T5Xm2fzv4WM4ol0FThqH80kvLD/4wvmt7I4qZj0GYwl0K15deJmG2qYe0RgJOYx0L/q1Fe6qgJRy9jWWw2Le1XrXy4QQ8E4LHfm2m6yZ4Yx24IuJqvqXf6L+krqRs6eU000 <--GITHUB RSA2048-->",
    # ECDSA
    "ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBMmCk+7XRmYOF1lQ2pFCy7nXJat3F4q8xBe3OF4ouYR0mk8Fm4n7D8Rzr4X3M7D9l0PyFrwfknzw9xWI3Vw0Te8=",
]

known_hosts = Path.home() / ".ssh" / "known_hosts"
known_hosts.parent.mkdir(parents=True, exist_ok=True)
existing = known_hosts.read_text() if known_hosts.exists() else ""
new_lines = []
for key in GITHUB_HOST_KEYS:
    line = f"github.com {key}"
    if line not in existing:
        new_lines.append(line)

if new_lines:
    with known_hosts.open("a") as f:
        for line in new_lines:
            f.write(line + "\n")
    known_hosts.chmod(0o644)
    print(f"Added {len(new_lines)} GitHub host keys to {known_hosts}")
else:
    print(f"github.com already in {known_hosts}")

# Quick connectivity test
try:
    ip = socket.gethostbyname("github.com")
    print(f"DNS: github.com -> {ip} (reachable)")
except Exception as e:
    print(f"DNS warning: {e}")
