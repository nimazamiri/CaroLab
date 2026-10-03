# CaroLab HMI + Serial Receiver — User Manual

- **Name:** caro_hmi1.html, getPV.php, insertPV.js, rx.js
- **Release Date:** 2 October 2026
- **Document Name:** HMI + Serial Receiver User Manual

---

## Table of Contents

1. [Introduction](#introduction)
2. [System Overview](#system-overview)
3. [Files and Their Roles](#files-and-their-roles)
4. [Database Schema](#database-schema)
5. [Serial Packet Format](#serial-packet-format)
6. [Parameter Setup Tables](#parameter-setup-tables)
7. [HTML Layout — Adding, Removing, Reconfiguring Dials](#html-layout--adding-removing-reconfiguring-dials)
8. [Running the System](#running-the-system)
9. [Troubleshooting](#troubleshooting)
10. [Extending the System](#extending-the-system)
11. [File Reference — One-Line Summaries](#file-reference--one-line-summaries)

---

## Introduction

### Purpose of This Document

This manual describes a **four-file HMI (Human-Machine Interface) system** for reading process values from a serial-connected field device, storing them in MySQL, and displaying them on a web page as dial gauges.

The system is deliberately minimal:

- **One HTML page** with four SVG dial gauges.
- **One PHP endpoint** that serves the latest values as JSON.
- **One Node.js receiver** that reads the serial port and inserts packets into MySQL.
- **One Node.js helper** that performs the actual SQL inserts.

There is no framework, no build step, no WebSocket, no external service. Every part is plain JavaScript, plain PHP, and plain SQL. It runs on a Raspberry Pi, a laptop, or an embedded PC.

### What This Manual Covers

| Section | Content |
|---|---|
| System Overview | The three-part architecture and data flow |
| Files and Their Roles | What each file does |
| Database Schema | The `processvalues1` table |
| Serial Packet Format | The comma-separated line format |
| Parameter Setup Tables | Every configurable value |
| HTML Layout | How to add/remove/reconfigure dials |
| Running the System | End-to-end startup |
| Troubleshooting | Common failures and fixes |
| Extending the System | WebSocket, auth, history, alerts |

### Conventions

| Item | Convention |
|---|---|
| Serial data | Comma-separated ASCII lines, `\n`-terminated |
| Tag IDs | Positive integers, one per dial |
| Packet ID | Positive integer, increments per received message |
| Values | Finite numbers |
| Timestamps | MySQL `TIMESTAMP`, server-stamped on insert |
| Polling | Browser fetches `getPV.php` once per second |
| Gauges | SVG rendered in the browser, no external library |

---

## System Overview

The system has three cooperating parts connected through a MySQL database:

```
   ┌──────────────┐      serial (COM7, 9600 baud)      ┌──────────────┐
   │  Field device│ ─────────────────────────────────▶ │   rx.js      │
   │  (Arduino,   │   "1, 1, 25, 2, 45, 3, 65, 4, 85"  │  (Node.js)   │
   │   PLC, etc.) │                                    └──────┬───────┘
   └──────────────┘                                           │
                                                              │ INSERT
                                                              ▼
                                                    ┌──────────────────┐
                                                    │   MySQL          │
                                                    │   dbhmi1         │
                                                    │   processvalues1 │
                                                    └────────┬─────────┘
                                                             │ SELECT
                                                             ▼
                                                    ┌──────────────────┐
                                                    │   getPV.php      │
                                                    │   (HTTP/JSON)    │
                                                    └────────┬─────────┘
                                                             │ GET / 1 s
                                                             ▼
                                                    ┌──────────────────┐
                                                    │ caro_hmi1.html   │
                                                    │ (browser, dials) │
                                                    └──────────────────┘
```

The **field device** sends comma-separated ASCII lines over a serial port. **`rx.js`** parses each line, splits it into one record per tag, and inserts each record into MySQL via **`insertPV.js`**. The **HMI page** polls **`getPV.php`** once per second, receives the latest value per tag as JSON, and updates the four SVG dial gauges.

There is no direct push from `rx.js` to the browser. The MySQL table is the single source of truth, and polling is what keeps the HMI in sync.

---

## Files and Their Roles

| File | Language | Role |
|---|---|---|
| `caro_hmi1.html` | HTML + JavaScript | The HMI page. Contains the `DialGauge` class and the polling loop. |
| `getPV.php` | PHP | HTTP endpoint. Returns the latest value per tag as JSON. |
| `insertPV.js` | Node.js | MySQL insertion helper. Provides `insertPV()` and `insertPacket()`. |
| `rx.js` | Node.js | Serial port reader. Parses incoming lines and calls `insertPacket()`. |

**Dependencies:**

- `rx.js` and `insertPV.js` need the `serialport` and `mysql2` npm packages.
- `getPV.php` needs a running MySQL/MariaDB server and PHP with `mysqli`.
- `caro_hmi1.html` needs a modern browser (any Chrome, Edge, Firefox, Safari).

**Install once:**

```
npm install serialport mysql2
```

---

## Database Schema

The system assumes a database `dbhmi1` with a table `processvalues1`:

```sql
CREATE TABLE processvalues1 (
  tagID     INT,
  pvID      INT,
  pvValue   FLOAT,
  pvTime    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

| Column | Type | Meaning |
|---|---|---|
| `tagID` | INT | Tag identifier (1, 2, 3, 4, …). One per dial. |
| `pvID` | INT | Packet identifier — usually increments per received message. |
| `pvValue` | FLOAT | The measured value for that tag. |
| `pvTime` | TIMESTAMP | Server-stamped on insert. The HMI uses the latest row per tag. |

**Note on indexing:** the table has no primary key or auto-increment column, so "latest" is determined by `MAX(pvTime) GROUP BY tagID`. If two packets land within the same second, the tie is broken arbitrarily by MySQL. **Adding an `id INT AUTO_INCREMENT PRIMARY KEY` column would make the "latest" lookup exact.** It is recommended for production use.

For a large table, an index on `(tagID, pvTime)` speeds up the query dramatically:

```sql
ALTER TABLE processvalues1 ADD INDEX idx_tag_time (tagID, pvTime);
```

---

## Serial Packet Format

The field device sends one line per message. Lines are terminated by `\n` (LF). Fields are comma-separated.

**Format:**

```
pvID, tagID1, value1, tagID2, value2, tagID3, value3, tagID4, value4 [, timestamp]
```

**Example:**

```
1, 1, 25, 2, 45, 3, 65, 4, 85
```

This means:

- `pvID = 1`
- Tag 1 → 25
- Tag 2 → 45
- Tag 3 → 65
- Tag 4 → 85

The optional 10th field is a timestamp. If omitted, MySQL uses `CURRENT_TIMESTAMP`.

**Field count:** `rx.js` requires at least 9 fields. Additional fields beyond the 9th are treated as the timestamp; any further fields are ignored. Up to **4 tags** are parsed per packet — if you need more, extend the loop.

**Byte budget:** at 9600 baud, one byte takes roughly 1.04 ms. A 40-character line takes about 42 ms to transmit. For a 1-second polling rate on the HMI side, this leaves plenty of headroom for additional tags.

---

## Parameter Setup Tables

### 1. `rx.js` — Serial Port Parameters

Edit the top of `rx.js`:

| Parameter | Default | Meaning |
|---|---|---|
| `'COM7'` | `'COM7'` | Serial port name. On Linux/Mac use `/dev/ttyUSB0` or `/dev/ttyACM0`. |
| `baudRate` | `9600` | Must match the field device. Common: 9600, 19200, 38400, 115200. |
| `parsePacket` min length | 9 | Minimum fields per line. Increase if you send more tags. |
| `tags.length < 4` | 4 | Maximum tags per packet. Increase for more dials. |

**Line:**

```javascript
const port = new SerialPort('COM7', { baudRate: 9600 });
```

Change `'COM7'` and `9600` to match your hardware.

### 2. `insertPV.js` — MySQL Connection Parameters

Edit the `createPool` call:

| Parameter | Default | Meaning |
|---|---|---|
| `host` | `'localhost'` | MySQL host. Use an IP for a remote server. |
| `user` | `'root'` | MySQL user. Create a dedicated user for production. |
| `password` | `''` | MySQL password. **Required** for any non-default setup. |
| `database` | `'dbhmi1'` | Database name. |
| `connectionLimit` | 5 | Maximum concurrent connections in the pool. |

**Line:**

```javascript
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',          // set your MySQL/phpMyAdmin root password here
  database: 'dbhmi1',
  connectionLimit: 5,
  ...
});
```

### 3. `getPV.php` — Server Parameters

Edit the top of the file:

| Parameter | Default | Meaning |
|---|---|---|
| `$host` | `'localhost'` | MySQL host. |
| `$user` | `'root'` | MySQL user. |
| `$pass` | `''` | MySQL password. |
| `$db` | `'dbhmi1'` | Database name. |

**Lines:**

```php
$host = 'localhost';
$user = 'root';
$pass = '';
$db   = 'dbhmi1';
```

### 4. `caro_hmi1.html` — HMI Parameters

Edit the setup block near the bottom:

| Parameter | Default | Meaning |
|---|---|---|
| `POLL_URL` | `'getPV.php'` | Endpoint URL. Use a full URL for a remote server. |
| `POLL_INTERVAL_MS` | `1000` | Polling frequency, in milliseconds. |
| `min`, `max`, `value`, `label` | — | Per-gauge configuration. See the next table. |

**Lines:**

```javascript
const POLL_URL = 'getPV.php';
const POLL_INTERVAL_MS = 1000;

const gauge1 = new DialGauge(mount1, { min: 0, max: 100, value: 45, label: '.' });
const gauge2 = new DialGauge(mount2, { min: 0, max: 100, value: 65, label: '.' });
const gauge3 = new DialGauge(mount3, { min: 0, max: 100, value: 25, label: '.' });
const gauge4 = new DialGauge(mount4, { min: 0, max: 100, value: 85, label: '.' });
```

### 5. DialGauge Constructor Options

| Option | Type | Default | Meaning |
|---|---|---|---|
| `min` | number | `0` | Gauge lower bound. |
| `max` | number | `100` | Gauge upper bound. Must be greater than `min`. |
| `value` | number | `0` | Initial value. Clamped to `[min, max]`. |
| `label` | string | `''` | Text below the value. |

**Runtime method:**

```javascript
gauge.update({ value, min, max, label });
```

Any subset of keys can be passed. Omitted keys keep their current values.

### 6. DialGauge Visual Parameters

These are set inside the `DialGauge` class, in the constructor and `render()`:

| Property | Default | Where |
|---|---|---|
| SVG dimensions | 300 × 300 | `this.width`, `this.height` |
| Face radius | 110 | `this.radius` |
| Start/end angle | −135° / +135° | `this.startAngle`, `this.endAngle` |
| Tick count | 11 | local `tickCount` in `render()` |
| Track color | `#e9edf2` | `trackArc` `stroke` |
| Progress color | `#2c7be5` | `progressArc` `stroke` |
| Needle color | `#1e293b` | `needle` `fill` |
| Value text size | 28 | `valueText` `font-size` |
| Label text size | 14 | `labelText` `font-size` |

All are settable by editing the `render()` method.

---

## HTML Layout — Adding, Removing, Reconfiguring Dials

### Current layout

The HTML has a 2×2 grid of `<td>` cells. Each cell contains:

```html
<div class="gauge-container">
  <div id="gaugeMountN"></div>       <!-- the SVG dial is injected here -->
  <div class="controls">
    <label id="labelN">TAG N</label>  <!-- static tag name -->
    <label id="labelN_value">45</label>  <!-- updated live from getPV.php -->
  </div>
</div>
```

### Adding a dial

1. Add a new `<td>` cell in the table with `id="gaugeMount5"` and `id="label5_value"`.
2. Add an entry to `gaugesByTag` and `valueLabelsByTag`:

```javascript
const gauge5 = new DialGauge(document.getElementById('gaugeMount5'), { min: 0, max: 100, value: 0 });
const gaugesByTag = { 1: gauge1, 2: gauge2, 3: gauge3, 4: gauge4, 5: gauge5 };
const valueLabelsByTag = {
  ..., 5: document.getElementById('label5_value')
};
```

3. Ensure `rx.js` sends tagID 5 in the packet (extend `tags.length < 4` to `< 5`), and `getPV.php` returns it (it is generic — no change needed).

### Removing a dial

Delete its `<td>` cell and remove the tag from `gaugesByTag` and `valueLabelsByTag`. The field device can keep sending the tag; the HMI will simply ignore it.

### Changing the gauge range

If your field values span 0–1000 instead of 0–100, update both the constructor and the DialGauge class:

```javascript
const gauge1 = new DialGauge(mount1, { min: 0, max: 1000, value: 450, label: 'Pressure' });
```

The gauge scales automatically: 11 ticks divide the range evenly.

### Changing the visual style

The dial colors and dimensions are set inside the `DialGauge` class:

| Property | Default | Where |
|---|---|---|
| SVG dimensions | 300 × 300 | `this.width`, `this.height` |
| Face radius | 110 | `this.radius` |
| Start/end angle | −135° / +135° | `this.startAngle`, `this.endAngle` |
| Track color | `#e9edf2` | `trackArc` `stroke` |
| Progress color | `#2c7be5` | `progressArc` `stroke` |
| Needle color | `#1e293b` | `needle` `fill` |

All are settable by editing the `render()` method.

### Changing the grid layout

The HTML uses a table with two rows of two cells each. To switch to a 4-across layout, change the table to a single row of four `<td>` cells. To switch to a single-column layout, use four rows of one cell. The `DialGauge` class does not care about layout — it only needs a mount element.

### Sizing the dials

The SVG has `width="100%"` and `height="100%"`, and its viewBox is 300×300. The actual rendered size is controlled by the containing `<div class="gauge-container">`. To make dials larger, set a fixed width on the container:

```css
.gauge-container { width: 300px; }
```

To make them smaller:

```css
.gauge-container { width: 150px; }
```

The SVG scales proportionally.

---

## Running the System

### 1. Set up MySQL

```sql
CREATE DATABASE dbhmi1;
USE dbhmi1;

CREATE TABLE processvalues1 (
  tagID     INT,
  pvID      INT,
  pvValue   FLOAT,
  pvTime    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tag_time (tagID, pvTime)
);
```

The index on `(tagID, pvTime)` speeds up `getPV.php` significantly on large tables.

### 2. Start the Node.js receiver

```
node rx.js
```

You should see:

```
COM7 opened successfully. isOpen: true
```

When a packet arrives:

```
packet: { pvID: 1, tags: [ { tagID: 1, value: 25 }, { tagID: 2, value: 45 }, { tagID: 3, value: 65 }, { tagID: 4, value: 85 } ] }
```

### 3. Serve the PHP endpoint and the HTML

Put `getPV.php` and `caro_hmi1.html` in the same web root (e.g. `htdocs/caro_hmi1/`). Open:

```
http://localhost/caro_hmi1/caro_hmi1.html
```

You should see four dials. If the database has recent values, the dials will move within a second.

### 4. Verify the endpoint directly

```
http://localhost/caro_hmi1/getPV.php
```

Expected response:

```json
{
  "1": { "pvValue": 45, "pvTime": "2026-09-25 05:12:03" },
  "2": { "pvValue": 65, "pvTime": "2026-09-25 05:12:03" },
  "3": { "pvValue": 25, "pvTime": "2026-09-25 05:12:03" },
  "4": { "pvValue": 85, "pvTime": "2026-09-25 05:12:03" }
}
```

If you see `{"error": "..."}`, the problem is on the PHP/MySQL side — check the `$host`, `$user`, `$pass`, `$db` values.

### 5. Insert a test row manually

If the HMI shows nothing, insert a row by hand and reload the page:

```sql
INSERT INTO processvalues1 (tagID, pvID, pvValue) VALUES (1, 1, 50);
```

The first dial should move to 50 within a second.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `COM7 opened successfully` never appears | Wrong port name | Check `'COM7'` — on Linux/Mac use `/dev/ttyUSB0` or similar |
| `Serial port error: ...` | Port in use, or wrong baud rate | Close other programs (Arduino IDE, PuTTY), match `baudRate` |
| No `packet:` lines in the console | Field device not sending, or wrong line terminator | Ensure the device sends lines ending in `\n` |
| `malformed packet` in the console | Wrong number of fields | Check the device's format against the packet format table |
| `ECONNREFUSED` from MySQL | MySQL not running | Start the MySQL service |
| `Access denied for user 'root'@'localhost'` | Wrong password | Set `password` in `insertPV.js` and `$pass` in `getPV.php` |
| Dial stays at the initial value | Polling endpoint failing | Open `getPV.php` in a browser; check for errors |
| `getPV.php` returns `{"error":"DB connection failed"}` | Wrong credentials, or wrong database name | Fix `$host`, `$user`, `$pass`, `$db` |
| `getPV.php` returns `{}` (empty) | Table is empty, or tagIDs do not match | Insert a test row manually: `INSERT INTO processvalues1 VALUES (1, 1, 50, NOW());` |
| Dial needle points the wrong way | `min`/`max` reversed | Check `min < max` in the constructor; the class warns and adjusts |
| Value shown on dial differs from `getPV.php` | Rounding | Dial rounds to 1 decimal; PHP returns the raw float |
| Page works locally but not on a network | CORS / mixed content | `getPV.php` sends `Access-Control-Allow-Origin: *`; ensure the browser can reach the URL |
| HMI shows old data after a page refresh | Browser cache | The polling fetch uses `cache: 'no-store'`; if still stale, clear the browser cache |
| Two dials show the same value | Duplicate `tagID` in the packet | Check the field device's output |
| Console shows `getPV.php poll failed: HTTP 500` | PHP script error | Check the PHP error log; usually a database issue |
| Console shows `getPV.php poll failed: Failed to fetch` | The browser cannot reach the endpoint | Verify the URL and the web server |
| Dial draws but the value text is off-center | Custom font | The value text uses `text-anchor: middle`; if your font is unusual, the baseline may shift |
| Needle does not reach the rightmost tick | `value === max` | The progress arc is skipped when `value === min`; check the actual value |
| Serial packets arrive but no rows are inserted | Async issue in the insert loop | Check the MySQL pool; the `connectionLimit` may be too low |
| MySQL "too many connections" | Pool too large, or script not closing connections | Reduce `connectionLimit`; ensure `pool.end()` is called on shutdown |

---

## Extending the System

**WebSocket push instead of polling.** Replace the `setInterval(pollOnce, 1000)` loop with a WebSocket client, and have `rx.js` emit each packet on the same WebSocket. This removes the 1-second lag and reduces database load.

**Multi-packet pvID.** Currently `pvID` comes from the field device. If you want the server to stamp it, increment a counter in `rx.js` per received packet.

**Auto-increment primary key.** Add `id INT AUTO_INCREMENT PRIMARY KEY` to `processvalues1` and change `getPV.php` to `ORDER BY id DESC LIMIT 1` per tag. This eliminates the tie-breaker issue.

**Authentication.** Add a shared token to `getPV.php` and the HMI's fetch calls, so the endpoint is not publicly readable. Example: `?token=abc123`, checked against a constant in the PHP script.

**Historical chart.** Add a second PHP endpoint that returns a time series for a tag over the last N minutes, and plot it alongside the dials. Use any charting library (Chart.js, Plotly, D3).

**Alert thresholds.** Add a `min`/`max` band per tag, and color the dial's progress arc differently when the value is out of range. The `DialGauge` class already has a `label` field; add a `warning` field and use it in `render()`.

**Multiple HMIs, one database.** Any number of browsers can poll `getPV.php`; they share the same MySQL table. Scale is bounded by MySQL, not by the number of clients.

**HTTPS.** If the HMI is served over HTTPS, `getPV.php` must also be HTTPS. The `Access-Control-Allow-Origin: *` header allows any origin, but the browser will block mixed content.

**Logging and replay.** Add a `pvLog` table that stores every received packet. This gives you a full history for debugging and replay.

**Multiple serial ports.** Extend `rx.js` to open several serial ports at once, each writing to the same table with a different `pvID` prefix.

**Separate tag tables.** If you have many tags, split them into separate tables by group. This improves query performance.

---

## File Reference — One-Line Summaries

| File | Summary |
|---|---|
| `caro_hmi1.html` | The browser page. Contains the `DialGauge` class and the polling loop. |
| `getPV.php` | Returns `{tagID: {pvValue, pvTime}}` for all tags. |
| `insertPV.js` | Provides `insertPV(tagID, pvID, pvValue, pvTime)` and `insertPacket(packet)`. |
| `rx.js` | Reads lines from the serial port, parses them, calls `insertPacket`. |

### Quick Reference — Common Tasks

**Change the polling rate to 2 seconds:**

```javascript
const POLL_INTERVAL_MS = 2000;
```

**Change the MySQL host:**

In `insertPV.js`: `host: '192.168.1.10'`
In `getPV.php`: `$host = '192.168.1.10';`

**Change the serial baud rate:**

```javascript
const port = new SerialPort('COM7', { baudRate: 115200 });
```

**Add a fifth dial:**

1. Add a `<td>` with `id="gaugeMount5"` and `id="label5_value"`.
2. Instantiate `gauge5`.
3. Add `5: gauge5` to `gaugesByTag`.
4. Add `5: document.getElementById('label5_value')` to `valueLabelsByTag`.

**Change a dial's range:**

```javascript
gauge1.update({ min: 0, max: 1000 });
```

**Change a dial's label:**

```javascript
gauge1.update({ label: 'Temperature (°C)' });
```

**Query the latest values manually:**

```sql
SELECT p.tagID, p.pvValue, p.pvTime
FROM processvalues1 p
INNER JOIN (
  SELECT tagID, MAX(pvTime) AS maxTime
  FROM processvalues1
  GROUP BY tagID
) latest ON p.tagID = latest.tagID AND p.pvTime = latest.maxTime;
```

---

## Closing Notes

The system is intentionally minimal: four files, one database table, no build step, no framework. It will run on any machine with Node.js, PHP, and MySQL.

The design has three deliberate properties:

1. **The database is the single source of truth.** The HMI does not read the serial port directly; it reads MySQL. This means the HMI can be on a different machine from the receiver, and multiple HMIs can read the same data.

2. **Polling, not push.** The browser fetches `getPV.php` once per second. This is simple and robust; a WebSocket would be faster but adds complexity. The 1-second lag is acceptable for most process monitoring.

3. **Immutable dial gauges.** Each gauge holds its own state and re-renders on `update()`. The polling loop only calls `update({ value })`, so the gauge manages its own visual state.

For a small HMI on a local network, this is enough. For a production system with many tags, high update rates, or remote clients, the Extending section shows the natural next steps — WebSocket push, authentication, historical logging, and multiple receivers.

---

*End of document.*

