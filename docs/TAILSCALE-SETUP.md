# Tailscale Remote Access Setup

This document describes how remote access via Tailscale was configured for the bulb controller app.

---

## ELI5 (Explain Like I'm 5)

**The Problem:** When you're abroad and connect via Tailscale VPN, typing `bulb.bozoz.lol` in your browser doesn't reach your bulbs because your phone/laptop asks the internet "where is bulb.bozoz.lol?" and gets the wrong answer.

**The Solution:** We set up a special phone book (DNS server) on your Pi that gives a different answer when you're on Tailscale:
- "Hey Pi, where's bulb.bozoz.lol?" → "It's at 100.114.15.27" (Tailscale address)

Then Tailscale magically routes your traffic through the VPN tunnel to your home Pi, which talks to the bulbs.

**Think of it like this:**
```
AT HOME:     You → WiFi → bulb.bozoz.lol (192.168.4.110) → Bulbs ✓
ABROAD:      You → Tailscale VPN → Pi → bulb.bozoz.lol (100.114.15.27) → Bulbs ✓
```

---

## Problem

When accessing the bulb controller via Tailscale VPN while abroad, the controls didn't work because:
1. The app uses `bulb.bozoz.lol` as the proxy domain
2. DNS resolved this to the public IP, but traffic via Tailscale bypasses the public IP route
3. The app needs `bulb.bozoz.lol` to resolve to the Pi's **Tailscale IP** when on the VPN

## Solution: Split DNS + Subnet Routing

Two things were configured:
1. **Split DNS**: When on Tailscale, DNS queries for `bozoz.lol` go to your Pi
2. **Subnet Routing**: Tailscale routes traffic to `192.168.4.0/24` through the Pi

---

## What Was Done

### 1. dnsmasq Installed on Raspberry Pi

```bash
sudo apt install dnsmasq
```

### 2. DNS Override Configuration

File: `/etc/dnsmasq.d/01-tailscale.conf`
```
# Listen on localhost and LAN IP
listen-address=127.0.0.1,192.168.4.110
port=53

# Return Tailscale IP for bulb.bozoz.lol
address=/bulb.bozoz.lol/100.114.15.27

# Forward all other DNS queries to upstream
server=1.1.1.1
server=8.8.8.8

# Don't read /etc/resolv.conf
no-resolv
```

### 3. Tailscale Subnet Routes Advertised

```bash
docker exec tailscale tailscale set --advertise-routes=192.168.4.0/24
```

### 4. Tailscale Admin Console Configuration

**Split DNS** (https://login.tailscale.com/admin/dns → Add nameserver):
- **Nameserver**: `192.168.4.110`
- **Domain**: `bozoz.lol` (check "Restrict to domain")

**Subnet Routes** (https://login.tailscale.com/admin/machines → raspberrypi):
- Approve `192.168.4.0/24` route

---

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                         AT HOME                                  │
├─────────────────────────────────────────────────────────────────┤
│  Browser → Public DNS → bulb.bozoz.lol = 192.168.4.110 (LAN)   │
│  Browser → https://192.168.4.110/proxy/... → Bulbs ✓            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         ABROAD (Tailscale ON)                    │
├─────────────────────────────────────────────────────────────────┤
│  1. Browser asks: "where is bulb.bozoz.lol?"                    │
│  2. Tailscale Split DNS routes query to Pi (192.168.4.110)      │
│  3. Pi's dnsmasq responds: "100.114.15.27" (Tailscale IP)       │
│  4. Browser → https://100.114.15.27/proxy/... → VPN → Bulbs ✓   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Verification Commands

Test DNS from Pi:
```bash
docker exec tailscale nslookup bulb.bozoz.lol 192.168.4.110
```

Expected output:
```
Server:         192.168.4.110
Address:        192.168.4.110#53

Name:   bulb.bozoz.lol
Address: 100.114.15.27
```

Check dnsmasq status:
```bash
sudo systemctl status dnsmasq
```

---

## Key Details

| Item | Value |
|------|-------|
| Pi LAN IP | `192.168.4.110` |
| Pi Tailscale IP | `100.114.15.27` |
| Domain | `bulb.bozoz.lol` |
| DNS Config File | `/etc/dnsmasq.d/01-tailscale.conf` |
| Subnet Route | `192.168.4.0/24` |

---

## Troubleshooting

### DNS not resolving correctly
```bash
sudo systemctl status dnsmasq
nslookup bulb.bozoz.lol 192.168.4.110
cat /etc/dnsmasq.d/01-tailscale.conf
```

### Tailscale not using Pi's DNS
- Verify Split DNS is configured in Tailscale admin console
- Check that subnet routes are approved in admin console

### dnsmasq fails to start
```bash
sudo journalctl -xeu dnsmasq
sudo dnsmasq --test -C /etc/dnsmasq.d/01-tailscale.conf
```

---

## Mistakes Made During Setup (All Cleaned Up)

| Mistake | What Happened | Cleanup |
|---------|---------------|---------|
| Wrong Docker image | Tried `andyshinn/dnsmasq` (x86 only) on ARM64 Pi | Image removed |
| Non-existent interface | Tried `interface=tailscale0` but it doesn't exist | Config fixed |
| Tried binding to Tailscale IP | `listen-address=100.114.15.27` doesn't work | Config fixed |
| Modified system file | Removed `--local-service` from dnsmasq init | Restored |
| Added iptables rules | Added port 53 ACCEPT rules (unnecessary) | Removed |
| Tried `tailscale serve` for DNS | Only supports TCP, DNS needs UDP | Removed |
| Installed packages in container | Added dnsmasq/bind-tools to Tailscale container | Uninstalled |

**What actually worked:** Install dnsmasq on host, explicit `listen-address`, Split DNS in Tailscale admin to route DNS queries to Pi's LAN IP.

---

## Final State (All Clean)

| Item | Status |
|------|--------|
| `/etc/dnsmasq.d/01-tailscale.conf` | ✓ Active (intentional) |
| dnsmasq service | ✓ Running via systemd |
| System files | ✓ Restored to original |
| Docker images | ✓ No leftovers |
| iptables | ✓ No added rules |
| Tailscale container | ✓ No extra packages |

---

*Last updated: 7 February 2026*
