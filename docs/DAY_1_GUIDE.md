# 📘 Day 1: Infrastructure & SQL Schema (Study & Build Guide)

Welcome back! When you are ready to study and execute **Day 1**, read through the 4 core concepts below (takes ~5 minutes) and then run the hands-on verification commands.

---

## 🧠 Part 1: What You Will Understand (Theory)

### 1. What are Docker Containers & Why Use `docker-compose.yml`?
Normally, setting up **PostgreSQL** and **Redis** on Windows requires downloading installers, configuring Windows background services, setting environment paths, and dealing with port conflicts.

- **A Docker Container** is an isolated, lightweight mini-box that packages a piece of software (like PostgreSQL 16 or Redis 7) with everything it needs to run.
- **`docker-compose.yml`** is a blueprint file that tells Docker: *"Spin up one PostgreSQL container on port `5432` and one Redis container on port `6379`, keep their data saved in Docker Volumes, and automatically run `backend/db/init.sql` to create our tables."*

---

### 2. Why PostgreSQL for Relational Data (`users`, `urls`, `clicks`)?
Our data has strict **relationships**:
1. One **User** can create many **Short URLs** (`1-to-Many`).
2. One **Short URL** can receive thousands of **Clicks** (`1-to-Many`).

In [`backend/db/init.sql`](../backend/db/init.sql), we enforce these relationships using:
- **Primary Key (`PRIMARY KEY`)**: A unique ID (`1, 2, 3...`) for every row in a table.
- **Foreign Key (`REFERENCES urls(id) ON DELETE CASCADE`)**: Guarantees that every row in `clicks` points to a real, existing row in `urls`. And with `ON DELETE CASCADE`, if a user deletes a shortened URL, PostgreSQL automatically cleans up all click telemetry rows associated with that URL so no "orphan" data pollutes your database.

---

### 3. How B-Tree Indexes Make Redirects & Charts 1,000x Faster
Imagine a textbook with **10,000,000 pages** (10 million shortened URLs) and someone clicks `http://localhost:5000/gh2026`.
- **Without an Index (`Sequential Scan` — $O(N)$)**: PostgreSQL must read row 1, row 2, row 3... all the way up to 10,000,000 to find `short_code = 'gh2026'`. That takes hundreds of milliseconds or seconds.
- **With a B-Tree Index ($O(\log N)$)**: A **Balanced Tree (B-Tree)** keeps `short_code` values sorted in a tree structure. Even with **10 million rows**, a B-Tree lookup takes at most **~23 comparisons** (under `1-2 milliseconds`!).

In `backend/db/init.sql`, we created:
1. `idx_urls_short_code` on `urls(short_code)` — for instant URL lookups when Redis has a Cache Miss.
2. `idx_clicks_url_id_clicked_at` on `clicks(url_id, clicked_at DESC)` — a **Composite Index** so fetching click timelines for a specific URL in our Day 5/6 dashboard is instantaneous.

---

## 🛠️ Part 2: Hands-On Commands (When You Return)

Make sure **Docker Desktop** is open and running on your machine, then run these 3 steps in your terminal:

### Step 1: Start PostgreSQL & Redis Containers
```powershell
docker compose up -d
```

### Step 2: Check Container Health
```powershell
docker compose ps
```
You should see both `pulselink-postgres` and `pulselink-redis` with status **`Up (healthy)`**.

### Step 3: Verify Your PostgreSQL Tables & Seed Data
Run this command to query PostgreSQL inside the container and see our pre-seeded `gh2026` short link:
```powershell
docker exec -it pulselink-postgres psql -U pulselink_user -d pulselink_db -c "SELECT u.short_code, u.original_url, c.country, c.browser, c.referrer FROM urls u JOIN clicks c ON u.id = c.url_id;"
```

### Step 4: Verify Redis is Responding
```powershell
docker exec -it pulselink-redis redis-cli ping
```
Expected output: `PONG`

---

> 💡 **When you're back:** Just reply *"Ready for Day 1 walkthrough / Day 2"* and we will test these together and move into **Day 2: The Shortening Engine (Base62 + Express API)**!
