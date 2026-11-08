# The App Review demo host: an SSH server that accepts any ed25519 key, because
# the reviewer's key cannot be known in advance. Hardened on the assumption that
# the door is open — see any-key.sh and sshd.conf.
#
# Containerised so the exact configuration that will face the internet can be
# run and verified locally first, from an erased simulator.
FROM alpine:3.20

RUN apk add --no-cache openssh-server openssh-sftp-server \
 && adduser -D -H -s /sbin/nologin review \
 # `adduser -D` leaves the account locked (`review:!`), which OpenSSH refuses
 # even for publickey auth. Unlock it without setting a password.
 && sed -i 's/^review:!/review:*/' /etc/shadow \
 && mkdir -p /etc/ssh/keys /srv/review

COPY sshd.conf /etc/ssh/sshd_config.d/reviewhost.conf
COPY any-key.sh /usr/local/bin/any-key.sh
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
# sshd refuses an AuthorizedKeysCommand that is writable by anyone but root,
# and silently falls back to denying the login.
RUN chmod 755 /usr/local/bin/any-key.sh /usr/local/bin/entrypoint.sh \
 && chown root:root /usr/local/bin/any-key.sh

EXPOSE 2222
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
