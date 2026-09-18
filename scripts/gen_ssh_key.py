#!/usr/bin/env python3
"""Generate ED25519 SSH keypair in OpenSSH format (compatible with paramiko & GitHub)."""
import base64
import hashlib
from pathlib import Path
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives import serialization

SSH_DIR = Path.home() / ".ssh"
SSH_DIR.mkdir(parents=True, exist_ok=True)
SSH_DIR.chmod(0o700)

priv = Ed25519PrivateKey.generate()
pub = priv.public_key()

# OpenSSH-format private key (unencrypted)
priv_bytes = priv.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.OpenSSH,
    encryption_algorithm=serialization.NoEncryption(),
)

# Public key in OpenSSH format (encoded as b'ssh-ed25519 <base64>')
pub_bytes = pub.public_bytes(
    encoding=serialization.Encoding.OpenSSH,
    format=serialization.PublicFormat.OpenSSH,
)
pub_line = pub_bytes.decode("ascii") + " los-compas-deploy@z-env\n"

priv_path = SSH_DIR / "id_ed25519"
pub_path = SSH_DIR / "id_ed25519.pub"

# Back up old key
if priv_path.exists():
    priv_path.rename(priv_path.with_suffix(".bak"))
if pub_path.exists():
    pub_path.rename(pub_path.with_suffix(".bak"))

priv_path.write_bytes(priv_bytes)
pub_path.write_text(pub_line)
priv_path.chmod(0o600)
pub_path.chmod(0o644)

# Compute SHA256 fingerprint
blob_b64 = pub_bytes.decode().split(" ")[1]
fp = hashlib.sha256(base64.b64decode(blob_b64)).digest()
fp_b64 = base64.b64encode(fp).decode().rstrip("=")
print("=== NEW Public Key (REPLACE the old one in GitHub Deploy Keys) ===")
print(pub_line)
print(f"SHA256 fingerprint: SHA256:{fp_b64}")
print(f"Private key saved at: {priv_path}")
