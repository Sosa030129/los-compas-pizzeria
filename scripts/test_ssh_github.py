#!/usr/bin/env python3
"""Test SSH connection to GitHub using paramiko and the ED25519 key."""
import paramiko
import sys
from pathlib import Path

KEY_PATH = Path.home() / ".ssh" / "id_ed25519"

# paramiko can read OpenSSH private key files via Ed25519Key
try:
    pkey = paramiko.Ed25519Key.from_private_key_file(str(KEY_PATH))
    print(f"Loaded ED25519 key: fingerprint SHA256:{pkey.get_fingerprint().hex()[:16]}...")
except Exception as e:
    print(f"❌ Could not load key: {e}")
    sys.exit(4)

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    print(f"Connecting to github.com as user 'git'...")
    client.connect(
        hostname="github.com",
        username="git",
        pkey=pkey,
        look_for_keys=False,
        allow_agent=False,
        timeout=15,
        auth_timeout=15,
    )
    print("✅ SSH connection established.")
    # GitHub sends the welcome banner via stderr of any command.
    stdin, stdout, stderr = client.exec_command("echo probe", timeout=10)
    out = stdout.read().decode(errors="replace")
    err = stderr.read().decode(errors="replace")
    print("--- stderr from GitHub ---")
    print(err.strip())
    print("--- stdout ---")
    print(out.strip())
    client.close()
    if "successfully authenticated" in err:
        print("\n🎉 Authenticated! SSH deploy key works.")
        sys.exit(0)
    else:
        print("\n⚠️ Did not see success banner.")
        sys.exit(1)
except paramiko.AuthenticationException as e:
    print(f"❌ Authentication failed: {e}")
    print("   Likely cause: deploy key not added to repo, or no write permission granted.")
    sys.exit(2)
except Exception as e:
    print(f"❌ Connection error: {type(e).__name__}: {e}")
    sys.exit(3)
