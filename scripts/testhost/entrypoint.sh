#!/bin/sh
# Prepares the volume-backed state, then runs sshd in the foreground.
set -eu

# Host keys: generated once, then reused forever. A regenerated host key would
# make every paired device refuse the connection as a suspected MITM.
[ -f /etc/ssh/keys/ssh_host_ed25519_key ] || \
  ssh-keygen -q -t ed25519 -N '' -f /etc/ssh/keys/ssh_host_ed25519_key
[ -f /etc/ssh/keys/ssh_host_rsa_key ] || \
  ssh-keygen -q -t rsa -b 3072 -N '' -f /etc/ssh/keys/ssh_host_rsa_key
chmod 600 /etc/ssh/keys/*_key

# authorized_keys is volume-backed too, so a phone authorized through the app
# stays authorized across restarts. AUTHORIZED_KEY seeds the Mac's own access.
touch /home/dev/.ssh/authorized_keys
if [ -n "${AUTHORIZED_KEY:-}" ] && ! grep -qxF "$AUTHORIZED_KEY" /home/dev/.ssh/authorized_keys; then
  printf '%s\n' "$AUTHORIZED_KEY" >> /home/dev/.ssh/authorized_keys
fi
chown -R dev:dev /home/dev/.ssh
chmod 700 /home/dev/.ssh
chmod 600 /home/dev/.ssh/authorized_keys

# The beam target. `mkdir -p` is what the app does too, but pre-creating it
# means a fresh container is immediately usable.
install -d -o dev -g dev -m 755 /tmp/hostbeam

exec /usr/sbin/sshd -D -e
