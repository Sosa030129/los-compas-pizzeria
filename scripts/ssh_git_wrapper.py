#!/usr/bin/env python3
"""SSH wrapper for git — uses paramiko instead of `ssh` binary."""
import os
import sys
import paramiko
from pathlib import Path

KEY_PATH = Path.home() / ".ssh" / "id_ed25519"
try:
    _PKEY = paramiko.Ed25519Key.from_private_key_file(str(KEY_PATH))
except Exception as e:
    sys.stderr.write(f"[ssh_git_wrapper] cannot load key: {e}\n")
    sys.exit(2)


def parse_ssh_args(argv):
    port = 22
    user = "git"
    host = None
    command = None
    rest = list(argv[1:])
    i = 0
    while i < len(rest):
        tok = rest[i]
        if tok == "-p":
            port = int(rest[i + 1]); i += 2; continue
        if tok.startswith("-o"):
            i += 2 if "=" not in tok else 1; continue
        if tok.startswith("-"):
            i += 1; continue
        if host is None and "@" in tok:
            user, host = tok.split("@", 1); i += 1; continue
        if host is not None and command is None:
            command = tok; i += 1
            return user, host, port, command, rest[i:]
        i += 1
    return user, host, port, None, []


def main():
    user, host, port, command, cmd_args = parse_ssh_args(sys.argv)
    if host is None or command is None:
        sys.stderr.write(f"Usage: {sys.argv[0]} [-p port] user@host command\nGot: {sys.argv}\n")
        sys.exit(2)
    full_cmd = command
    if cmd_args:
        full_cmd = " ".join([command] + cmd_args)

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(hostname=host, port=port, username=user, pkey=_PKEY,
                        look_for_keys=False, allow_agent=False,
                        timeout=30, auth_timeout=30, banner_timeout=30)
    except Exception as e:
        sys.stderr.write(f"[ssh_git_wrapper] connect failed: {type(e).__name__}: {e}\n")
        sys.exit(1)

    transport = client.get_transport()
    chan = transport.open_session()
    chan.set_combine_stderr(False)
    chan.exec_command(full_cmd)

    import threading
    def pump_stdin_to_chan():
        try:
            while True:
                data = os.read(0, 4096)
                if not data:
                    chan.shutdown_write(); break
                chan.sendall(data)
        except Exception:
            pass

    t = threading.Thread(target=pump_stdin_to_chan, daemon=True)
    t.start()

    try:
        while True:
            if chan.recv_ready():
                data = chan.recv(4096)
                if data:
                    sys.stdout.buffer.write(data); sys.stdout.buffer.flush()
            elif chan.recv_stderr_ready():
                data = chan.recv_stderr(4096)
                if data:
                    sys.stderr.buffer.write(data); sys.stderr.buffer.flush()
            else:
                if chan.exit_status_ready() and not chan.recv_ready() and not chan.recv_stderr_ready():
                    break
    finally:
        exit_code = chan.recv_exit_status()
        chan.close(); client.close()
        sys.exit(exit_code)


if __name__ == "__main__":
    main()
