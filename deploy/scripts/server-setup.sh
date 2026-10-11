#!/usr/bin/env bash
# One-time setup of a fresh Ubuntu 24.04 Droplet (docs/DEPLOY.md, step 3). Run as root:
#   scp deploy/scripts/server-setup.sh root@<droplet-ip>:/root/
#   ssh -t root@<droplet-ip> bash /root/server-setup.sh     (-t: it asks for a sudo password)
# Safe to run again: every step checks what is already there.
#
# It creates the sudo user `deploy` with the SSH keys root has (the ones you gave
# DigitalOcean), then turns off root login and password logins. KEEP THIS ROOT SESSION OPEN
# until `ssh deploy@<droplet-ip>` works from a second terminal.
set -euo pipefail

DEPLOY_USER=deploy
APP_DIR=/opt/avenir
TIMEZONE=Europe/Tirane
SWAP_SIZE=2G

[[ $EUID -eq 0 ]] || { echo "Run this as root." >&2; exit 1; }
. /etc/os-release
[[ $ID == ubuntu ]] || { echo "This script is for Ubuntu (found $ID)." >&2; exit 1; }
step() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
export DEBIAN_FRONTEND=noninteractive

step "System packages"
apt-get update -q
apt-get -o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold upgrade -yq
apt-get install -yq ca-certificates curl gnupg ufw fail2ban unattended-upgrades rsync

step "User $DEPLOY_USER"
if ! id "$DEPLOY_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$DEPLOY_USER"
fi
usermod -aG sudo "$DEPLOY_USER"
# sudo asks for this password (SSH logins never do: keys only).
if [[ $(passwd -S "$DEPLOY_USER" | awk '{print $2}') != P ]]; then
  echo "Choose a password for $DEPLOY_USER (used only for sudo):"
  until passwd "$DEPLOY_USER"; do :; done
fi
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
keys="/home/$DEPLOY_USER/.ssh/authorized_keys"
touch "$keys"
# Add root's keys (DigitalOcean puts yours there) and, optionally, SSH_PUBLIC_KEY.
{ cat /root/.ssh/authorized_keys 2>/dev/null || true; echo "${SSH_PUBLIC_KEY:-}"; } |
  { grep -E '^(ssh-|ecdsa-|sk-)' || true; } | while read -r key; do
    grep -qxF "$key" "$keys" || echo "$key" >>"$keys"
  done
chown "$DEPLOY_USER:$DEPLOY_USER" "$keys"
chmod 600 "$keys"
if [[ ! -s $keys ]]; then
  echo "No SSH key for $DEPLOY_USER. Add one to /root/.ssh/authorized_keys or pass" >&2
  echo "SSH_PUBLIC_KEY='ssh-ed25519 …' and run again. SSH settings were NOT changed." >&2
  exit 1
fi

step "SSH: keys only, no root login"
# 00- sorts before Ubuntu's 50-cloud-init.conf, and sshd keeps the first value it reads.
cat >/etc/ssh/sshd_config.d/00-avenir.conf <<'CONF'
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
CONF
sshd -t
systemctl reload ssh

step "Firewall: only 22, 80 and 443"
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp # HTTP/3
ufw --force enable
# Note: Docker writes its own iptables rules for published ports. Only Caddy publishes any
# (80/443); Postgres and the apps have none, so nothing else is reachable.

step "fail2ban (SSH)"
cat >/etc/fail2ban/jail.d/sshd.local <<'CONF'
[sshd]
enabled = true
backend = systemd
maxretry = 5
findtime = 10m
bantime = 1h
CONF
systemctl enable --now fail2ban
systemctl restart fail2ban

step "Automatic security updates"
cat >/etc/apt/apt.conf.d/20auto-upgrades <<'CONF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
CONF
systemctl enable --now unattended-upgrades

step "Timezone $TIMEZONE"
timedatectl set-timezone "$TIMEZONE"

step "Swap ($SWAP_SIZE)"
if ! swapon --show=NAME --noheadings | grep -qx /swapfile; then
  [[ -f /swapfile ]] || fallocate -l "$SWAP_SIZE" /swapfile
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
fi
grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >>/etc/fstab
echo 'vm.swappiness=10' >/etc/sysctl.d/99-avenir-swap.conf
sysctl -q --system

step "Docker Engine + Compose plugin (Docker's apt repository)"
if ! command -v docker >/dev/null || ! docker compose version >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${UBUNTU_CODENAME:-$VERSION_CODENAME} stable" \
    >/etc/apt/sources.list.d/docker.list
  apt-get update -q
  apt-get install -yq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
# Default log rotation for every container (the compose file sets the same per service).
if [[ ! -f /etc/docker/daemon.json ]]; then
  cat >/etc/docker/daemon.json <<'CONF'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" }
}
CONF
  systemctl restart docker
fi
systemctl enable --now docker
usermod -aG docker "$DEPLOY_USER"

step "App directory $APP_DIR"
install -d -m 750 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$APP_DIR" "$APP_DIR/deploy"

step "Done"
cat <<DONE
Now, from a SECOND terminal (keep this one open until it works):
  ssh $DEPLOY_USER@$(curl -fsS --max-time 3 https://api.ipify.org 2>/dev/null || echo '<droplet-ip>')
  docker ps        # works without sudo (new group membership)
Root login and password logins are now off.
DONE
