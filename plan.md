# LeafTrack Zero-Downtime Migration & Infrastructure Plan

## Architecture Overview
* **Server:** Bare-metal Ubuntu Server.
* **Domain:** `sohagtea.in` (Managed via Hostinger).
* **App Stack:** Next.js (App Router), Node.js, PM2.
* **Database:** Supabase (migrating from MongoDB Atlas).
* **Proxy/SSL:** Nginx + Let's Encrypt (Certbot).
* **Security:** Tailscale VPN (Admin access), UFW (Firewall).
* **CI/CD:** GitHub Actions (Zero-downtime `pm2 reload`).
* **Storage:** Externally mounted drive for DB backups and PDF bills.

---

## Day 1: Bare Metal, Security, & Storage (Thursday/Friday)

### 1. OS & Network Setup
- [ ] Flash Ubuntu Server ISO to USB and install on the physical machine (select OpenSSH Server during install).
- [ ] Find local IP and SSH into the server locally.
- [ ] Run system updates: `sudo apt update && sudo apt upgrade -y`.

### 2. Tailscale & Firewall (UFW)
- [ ] Install Tailscale: `curl -fsSL https://tailscale.com/install.sh | sh`.
- [ ] Authenticate the server: `sudo tailscale up`.
- [ ] Disconnect local SSH and reconnect using the Tailscale IP (`100.x.x.x`).
- [ ] Configure UFW to lock down SSH and open web ports:
  - `sudo ufw allow in on tailscale0 to any port 22`
  - `sudo ufw allow 80/tcp`
  - `sudo ufw allow 443/tcp`
  - `sudo ufw delete allow OpenSSH` (if previously set)
  - `sudo ufw enable`

### 3. External Storage Mount
- [ ] Identify the external drive: `lsblk`.
- [ ] Create mount directories: 
  - `sudo mkdir -p /mnt/leaftrack_storage/db_backups`
  - `sudo mkdir -p /mnt/leaftrack_storage/bills`
- [ ] Mount the drive (e.g., `sudo mount /dev/sdb1 /mnt/leaftrack_storage`).
- [ ] Grant permissions: `sudo chown -R $USER:$USER /mnt/leaftrack_storage`.
- [ ] Persist mount on reboot by adding the drive to `/etc/fstab`.

---

## Day 2: The Database "Dual-Write" Phase (Friday)

### 1. Supabase Preparation
- [ ] Provision Supabase instance (Cloud or Local Docker).
- [ ] Map MongoDB schema to PostgreSQL relational tables (`inventory`, `batches`, etc.).

### 2. Application Code Updates (Phase 1)
- [ ] Update Next.js Server Actions: Implement dual-writes (create/update/delete writes to **both** MongoDB and Supabase).
- [ ] Ensure the app still **reads** exclusively from MongoDB.
- [ ] Deploy this intermediate code to the *current* hosting provider.

### 3. Data Migration
- [ ] Write and execute a local Node.js script using Mongoose and Supabase JS client.
- [ ] Fetch all existing MongoDB documents and bulk-insert them into Supabase.
- [ ] Verify Supabase data matches MongoDB and live updates are syncing.

---

## Day 3: Server Environment & CI/CD (Saturday)

### 1. Node Environment & PM2
- [ ] Install Node.js (v20+) via NVM.
- [ ] Install PM2 globally: `npm install -g pm2`.
- [ ] Create project directory: `sudo mkdir -p /var/www/leaftrack && sudo chown -R $USER:$USER /var/www/leaftrack`.

### 2. GitHub Actions CI/CD Pipeline
- [ ] Generate a reusable Tailscale Auth Key.
- [ ] Add GitHub Secrets to the repository: `TS_AUTHKEY`, `SERVER_TAILSCALE_IP`, `SSH_PRIVATE_KEY`, `SSH_USERNAME`.
- [ ] Create `.github/workflows/deploy.yml` to automate SSH, `git pull`, `npm install`, `npm run build`, and `pm2 reload leaftrack`.
- [ ] Push code to trigger the first automated deployment to the Ubuntu server.

### 3. Nginx Reverse Proxy
- [ ] Install Nginx: `sudo apt install nginx`.
- [ ] Create server block `/etc/nginx/sites-available/flowsheet` routing port 80 to `localhost:3000`.
- [ ] Ensure WebSocket headers are included (`Upgrade $http_upgrade`, `Connection 'upgrade'`) for future live-tracking readiness.
- [ ] Enable the site and restart Nginx.

### 4. Application Code Updates (Phase 2)
- [ ] Update PDF generation logic to write files directly to `/mnt/leaftrack_storage/bills` using the Node `fs` module.
- [ ] Push update via CI/CD.

---

## Day 4: DNS Cutover & Retirement (Sunday)

### 1. The Zero-Downtime Switch
- [ ] Lower TTL for `flowsheet.in` in Hostinger DNS settings to 300 seconds.
- [ ] Update `@` and `www` A records to the new Ubuntu server's public IP address.
- [ ] Monitor traffic routing.

### 2. SSL Provisioning
- [ ] As soon as DNS propagates, run Certbot: `sudo apt install certbot python3-certbot-nginx`.
- [ ] Provision SSL: `sudo certbot --nginx -d flowsheet.in -d www.flowsheet.in`.

### 3. Retiring MongoDB
- [ ] Once 100% of traffic is confirmed on the new server, update Next.js Server Actions to read/write **exclusively** to Supabase.
- [ ] Remove all MongoDB logic from the codebase.
- [ ] Push final code via CI/CD.
- [ ] Decommission MongoDB Atlas instance.

### 4. Automated Backups (Cron)
- [ ] Install Postgres client: `sudo apt install postgresql-client`.
- [ ] Create `backup_db.sh` to run `pg_dump` targeting the Supabase URI, outputting to `/mnt/leaftrack_storage/db_backups`.
- [ ] Make executable (`chmod +x`).
- [ ] Add to Crontab (`crontab -e`) to run quarterly: `0 0 1 */3 * /home/$USER/backup_db.sh`.