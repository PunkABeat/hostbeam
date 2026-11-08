# A throwaway SSH host for local development (docs/process/test-host.md).
# Deliberately shaped like a host Hostbeam is meant to talk to: OpenSSH,
# publickey auth only, a non-default port, and a writable scratch folder.
FROM alpine:3.20

# tmux, mosh and Claude Code are what an agent host runs (next.md § 10a): the
# Ctrl+V spike has to prove itself through all three. Claude Code's native
# build needs bash, libgcc, libstdc++ and ripgrep on musl.
RUN apk add --no-cache openssh-server tmux mosh python3 bash curl libgcc libstdc++ ripgrep \
 && adduser -D -s /bin/sh dev \
 # `adduser -D` leaves the account locked (`dev:!`), which OpenSSH refuses even
 # for publickey auth. Unlock it without setting a password.
 && sed -i 's/^dev:!/dev:*/' /etc/shadow \
 && mkdir -p /home/dev/.ssh /etc/ssh/keys \
 && chown -R dev:dev /home/dev

# mosh-server refuses to start without a UTF-8 locale; musl's is C.UTF-8.
ENV LANG=C.UTF-8

# Claude Code for `dev`, at whatever version is current when the image is
# built. ~/.local/bin goes on the login PATH, which is also where the Ctrl+V
# stand-ins are installed — ahead of any real xclip, as on a user's host.
USER dev
RUN curl -fsSL https://claude.ai/install.sh | bash \
 && printf 'export PATH="$HOME/.local/bin:$PATH"\n' > /home/dev/.profile
USER root

# Host keys live on a volume, not in the image: rebuilding the image must not
# change the host's identity, or every paired phone hits a host-key mismatch
# and has to re-trust. Password auth is off, as a hardened host would have it —
# ADR 0016 assumes publickey-only.
COPY sshd.conf /etc/ssh/sshd_config.d/testhost.conf
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 2222
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
