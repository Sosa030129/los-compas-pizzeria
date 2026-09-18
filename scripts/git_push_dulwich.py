#!/usr/bin/env python3
"""
Pure-Python git push to GitHub via SSH using dulwich + paramiko.

This avoids the need for the `ssh` binary (not installed in this container).
Dulwich does git protocol, paramiko does the SSH transport.
"""
import sys
import os
import socket
import struct
import paramiko
from pathlib import Path
from dulwich.client import SSHGitClient
from dulwich.repo import Repo

REPO_PATH = Path("/home/z/my-project")
REPO_URL = "git@github.com:Sosa030129/los-compas-pizzeria.git"
KEY_PATH = Path.home() / ".ssh" / "id_ed25519"

# Parse git@github.com:USER/REPO.git
host_part, path_part = REPO_URL.split(":", 1)
hostname = host_part.split("@")[-1]
# Strip trailing .git if present
path = path_part[:-4] if path_part.endswith(".git") else path_part

# Load paramiko Ed25519 key
pkey = paramiko.Ed25519Key.from_private_key_file(str(KEY_PATH))

class ParamikoSSHVendor:
    """Dulwich vendor that runs git via paramiko (no `ssh` binary needed)."""
    def run_command(
        self,
        host,
        command,
        username=None,
        port=None,
        password=None,
        key_filename=None,
        ssh_command=None,
        protocol_version=None,
        **kwargs,
    ):
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(
            hostname=host,
            username=username or "git",
            pkey=pkey,
            look_for_keys=False,
            allow_agent=False,
            timeout=30,
            auth_timeout=30,
        )
        # Build the actual git command on the remote side
        full_cmd = command
        chan = client.get_transport().open_session()
        chan.exec_command(full_cmd)

        # Return a stream-like object that dulwich can read/write
        class Stream:
            def __init__(self, chan):
                self.chan = chan
                self.stdout = chan.makefile("rb")
                self.stderr = chan.makefile_stderr("rb")
            def read(self, n=-1):
                return self.stdout.read(n)
            def write(self, data):
                self.chan.sendall(data if isinstance(data, bytes) else data.encode())
            def close(self):
                try:
                    self.chan.close()
                    client.close()
                except Exception:
                    pass
            def can_read(self):
                return self.chan.recv_ready()
        return Stream(chan)

    def connect(self, host, port=None, username=None, password=None, key_filename=None, **kwargs):
        return None

# Use dulwich to push
repo = Repo(str(REPO_PATH))
print(f"Local HEAD: {repo.head().decode()}")

# Get the SSH client with our paramiko vendor
ssh_vendor = ParamikoSSHVendor()
client = SSHGitClient(
    host=hostname,
    username="git",
    vendor=ssh_vendor,
)

# Push main branch
refspecs = [b"refs/heads/main"]
remote_location = f"{hostname}/{path}"

print(f"Pushing main -> {REPO_URL} ...")
try:
    result = client.send_pack(
        path,
        lambda refs: refs,  # generate_pack_href callback
        repo.object_store.generate_pack_data,
        None,  # progress callback
    )
    print("Push result:", result)
except Exception as e:
    print(f"❌ Push failed: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
