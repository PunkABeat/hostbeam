#!/bin/sh
set -eu

[ -f /etc/ssh/keys/ssh_host_ed25519_key ] || \
  ssh-keygen -q -t ed25519 -N '' -f /etc/ssh/keys/ssh_host_ed25519_key
chmod 600 /etc/ssh/keys/*_key

# A chroot's root must be owned by root and not writable by anyone else, or
# sshd refuses the session outright — a failure that looks like "connection
# closed" and tells the reviewer nothing.
chown root:root /srv/review
chmod 755 /srv/review

# The app's DEFAULT remote folder, pre-made inside the chroot, so a reviewer
# adds the host and changes nothing. `ensureDirectory` swallows an
# already-exists error, so this is the path of least instruction.
install -d -o review -g review -m 755 /srv/review/tmp /srv/review/tmp/hostbeam

exec /usr/sbin/sshd -D -e
