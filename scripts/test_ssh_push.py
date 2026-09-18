#!/usr/bin/env python3
"""Test SSH push capability via git-upload-pack ls-remote probe."""
import paramiko
import sys
from pathlib import Path

KEY_PATH = Path.home() / ".ssh" / "id_ed25519"
pkey = paramiko.Ed25519Key.from_private_key_file(str(KEY_PATH))

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    client.connect(
        hostname="github.com",
        username="git",
        pkey=pkey,
        look_for_keys=False,
        allow_agent=False,
        timeout=15,
        auth_timeout=15,
    )
    # The probe for git over SSH: invoke "git-upload-pack '<repo>'"
    # GitHub responds with the refs (HEAD, branches, tags) — same data as git ls-remote.
    repo = "Sosa030129/los-compas-pizzeria"
    stdin, stdout, stderr = client.exec_command(
        f"git-upload-pack '{repo}'",
        timeout=15,
    )
    out = stdout.read().decode(errors="replace")
    err = stderr.read().decode(errors="replace")
    print("--- stderr (welcome banner) ---")
    print(err.strip())
    print("--- stdout (refs from remote) ---")
    print(out[:500])
    client.close()
    # GitHub's welcome banner includes "successfully authenticated" for valid deploy keys
    if "successfully authenticated" in err:
        print("\n🎉 SSH deploy key authenticated. Push will work.")
        sys.exit(0)
    elif "Write permission" in err or "denied" in err.lower():
        print("\n⚠️ Key is read-only. Need to enable 'Allow write access' on GitHub.")
        sys.exit(1)
    else:
        print("\n⚠️ Authentication OK but unexpected response.")
        sys.exit(1)
except paramiko.AuthenticationException as e:
    print(f"❌ Authentication failed: {e}")
    sys.exit(2)
except Exception as e:
    print(f"❌ Connection error: {type(e).__name__}: {e}")
    sys.exit(3)
