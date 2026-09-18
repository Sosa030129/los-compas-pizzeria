#!/usr/bin/env python3
"""Generate ED25519 SSH keypair (compatible with OpenSSH authorized_keys)."""
import base64
import struct
from pathlib import Path
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives import serialization

SSH_DIR = Path.home() / ".ssh"
SSH_DIR.mkdir(parents=True, exist_ok=True)
SSH_DIR.chmod(0o700)

priv = Ed25519PrivateKey.generate()
pub = priv.public_key()

# PEM (PKCS8 unencrypted) -> OpenSSH private key format
priv_pem = priv.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.PKCS8,
    encryption_algorithm=serialization.NoEncryption(),
)

# Build the OpenSSH public key wire format for ED25519:
# string "ssh-ed25519", string <32-byte public key>
raw_pub = pub.public_bytes(
    encoding=serialization.Encoding.Raw,
    format=serialization.PublicFormat.Raw,
)

def ssh_string(b: bytes) -> bytes:
    return struct.pack(">I", len(b)) + b

blob = ssh_string(b"ssh-ed25519") + ssh_string(raw_pub)
b64 = base64.b64encode(blob).decode("ascii")
ssh_pub_line = f"ssh-ed25519 {b64} los-compas-deploy@z-env\n"

priv_path = SSH_DIR / "id_ed25519"
pub_path = SSH_DIR / "id_ed25519.pub"
priv_path.write_bytes(priv_pem)
pub_path.write_text(ssh_pub_line)
priv_path.chmod(0o600)
pub_path.chmod(0o644)

print("=== Public key (paste this into GitHub Deploy Keys) ===")
print(ssh_pub_line)
print(f"\n=== Files saved ===")
print(f"Private: {priv_path}")
print(f"Public : {pub_path}")
