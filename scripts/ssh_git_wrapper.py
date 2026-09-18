#!/usr/bin/env python3
"""
SSH wrapper for git — uses paramiko instead of `ssh` binary.

Called by git as: GIT_SSH_COMMAND="python3 ssh_git_wrapper.py ..."
git invokes it like: ssh_git_wrapper.py [-p port] user@host command args...

Pipes stdin/stdout/stderr between the parent git process and the remote SSH channel,
so git sees a normal SSH connection.
"""
import os
import sys
import paramiko
from pathlib import Path

KEY_PATH = Path.home() / ".ssh" / "id_ed25519"
# Pre-load the key once (it never changes during a single git push)
_PKEY = paramiko.Ed25519Key.from_private_key_file(str(KEY_PATH))


def parse_ssh_args(argv):
    """Parse OpenSSH-style args, returning (user, host, port, command, command_args)."""
    port = 22
    user = "git"
    host = None
    command = None
    rest = list(argv[1:])  # drop program name

    # Skip options like -o Foo=bar, -o Foo bar
    i = 0
    while i < len(rest):
        tok = rest[i]
        if tok == "-p":
            port = int(rest[i + 1])
            i += 2
            continue
        if tok.startswith("-o"):
            # -o Option=Value  OR  -o Option Value
            if "=" in tok:
                i += 1
                continue
            else:
                i += 2
                continue
        if tok.startswith("-"):
            # Unknown option, skip
            i += 1
            continue
        # First non-option = user@host
        if host is None and "@" in tok:
            user, host = tok.split("@", 1)
            i += 1
            continue
        # Everything after host is the remote command
        if host is not None and command is None:
            command = tok
            i += 1
            command_args = rest[i:]
            return user, host, port, command, command_args
        i += 1
    return user, host, port, None, []


def main():
    user, host, port, command, cmd_args = parse_ssh_args(sys.argv)
    if host is None or command is None:
        sys.stderr.write(
            f"Usage: {sys.argv[0]} [-p port] user@host command\n"
            f"Got argv: {sys.argv}\n"
        )
        sys.exit(2)

    # Reconstruct the full remote command line
    full_cmd = command
    if cmd_args:
        import shlex
        full_cmd = " ".join([command] + cmd_args)

    sys.stderr.write(
        f"[ssh_git_wrapper] connecting {user}@{host}:{port} → {full_cmd}\n"
    )

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        client.connect(
            hostname=host,
            port=port,
            username=user,
            pkey=_PKEY,
            look_for_keys=False,
            allow_agent=False,
            timeout=30,
            auth_timeout=30,
            banner_timeout=30,
        )
    except Exception as e:
        sys.stderr.write(f"[ssh_git_wrapper] connect failed: {type(e).__name__}: {e}\n")
        sys.exit(1)

    transport = client.get_transport()
    chan = transport.open_session()
    # Set environment so git protocol works
    chan.set_combine_stderr(False)
    chan.exec_command(full_cmd)

    # Pipe stdin -> channel.stdin
    # Pipe channel.stdout -> stdout
    # Pipe channel.stderr -> stderr
    # We need to do this bidirectionally. Use threads for stdin -> chan.
    import threading

    def pump_stdin_to_chan():
        try:
            while True:
                data = os.read(0, 4096)
                if not data:
                    chan.shutdown_write()
                    break
                chan.sendall(data)
        except Exception:
            pass

    t = threading.Thread(target=pump_stdin_to_chan, daemon=True)
    t.start()

    # Read channel output
    try:
        while True:
            # Check both stdout and stderr streams from channel
            if chan.recv_ready():
                data = chan.recv(4096)
                if data:
                    sys.stdout.buffer.write(data)
                    sys.stdout.buffer.flush()
            elif chan.recv_stderr_ready():
                data = chan.recv_stderr(4096)
                if data:
                    sys.stderr.buffer.write(data)
                    sys.stderr.buffer.flush()
            else:
                if chan.exit_status_ready() and not chan.recv_ready() and not chan.recv_stderr_ready():
                    break
    finally:
        exit_code = chan.recv_exit_status()
        chan.close()
        client.close()
        sys.exit(exit_code)


if __name__ == "__main__":
    main()
