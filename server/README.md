# 🕌 Salah Companion Backend API

Production-ready, lightweight Node.js & Express REST API for **Salah Companion** (Prayer Tracker), built with ES Modules, SQLite (`better-sqlite3`), and `adhan` for offline astronomical prayer calculations.

---

## 📁 Architecture & Folder Structure

```text
server/
├── .env                  # Runtime environment variables
├── .env.example          # Environment template
├── package.json          # Dependencies & npm scripts
├── database.sqlite       # SQLite local database file (auto-generated)
└── src/
    ├── server.js         # Express app entry point, CORS, logging, graceful shutdown
    ├── config/
    │   └── env.js        # Environment parser & defaults
    ├── db/
    │   ├── connection.js # better-sqlite3 connection singleton (WAL mode, foreign keys)
    │   └── schema.sql    # SQLite DDL schema
    ├── controllers/
    │   ├── prayerController.js # Handles prayer calculation & logging requests
    │   ├── hadithController.js # Handles status-based Hadith requests
    │   └── userController.js   # Handles user 7-day stats and streaks
    ├── services/
    │   ├── prayerService.js    # adhan astronomical calculation engine
    │   ├── logService.js       # Prayer timing logic (on_time, late, missed) & SQLite persistence
    │   ├── hadithService.js    # Authentic Hadiths library (Arabic, translations, wisdom)
    │   └── userService.js      # 7-day completion aggregations & streak algorithm
    ├── routes/
    │   ├── index.js            # Aggregates sub-routers & health check
    │   ├── prayerRoutes.js     # /api/prayers and /api/prayer/log
    │   ├── hadithRoutes.js     # /api/hadith
    │   └── userRoutes.js       # /api/user/:id/stats and user management
    └── middlewares/
        └── errorHandler.js     # Centralized error handler & 404 handler
```

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd server
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```env
PORT=4000
NODE_ENV=development
CORS_ORIGIN=*
DATABASE_PATH=./database.sqlite
PRIME_WINDOW_MINUTES=35
```

### 3. Run Locally
```bash
# Start in production mode:
npm start

# Or start with auto-reload (Node.js 18+ watch mode):
npm run dev
```

---

## 📡 API Endpoints Reference

### 1. Calculate Prayer Times
`GET /api/prayers?lat={lat}&lng={lng}&method={method}&madhab={madhab}`

- **Query Parameters**:
  - `lat` (required): Latitude (e.g. `19.0760`)
  - `lng` (required): Longitude (e.g. `72.8777`)
  - `method` (optional): `Karachi` (default), `MWL`, `Egypt`, `Makkah`, `ISNA`, etc.
  - `madhab` (optional): `Hanafi` (default), `Shafi`

**Sample Response**:
```json
{
  "success": true,
  "data": {
    "date": "2026-10-08",
    "calculationMethod": "Karachi",
    "madhab": "Hanafi",
    "coordinates": { "latitude": 19.076, "longitude": 72.8777 },
    "times": {
      "fajr": "2026-10-07T23:48:00.000Z",
      "sunrise": "2026-10-08T01:01:00.000Z",
      "dhuhr": "2026-10-08T06:57:00.000Z",
      "asr": "2026-10-08T11:13:00.000Z",
      "maghrib": "2026-10-08T12:51:00.000Z",
      "isha": "2026-10-08T14:04:00.000Z"
    },
    "currentPrayer": {
      "name": "Maghrib",
      "startTime": "2026-10-08T12:51:00.000Z",
      "endTime": "2026-10-08T14:04:00.000Z"
    },
    "nextPrayer": {
      "name": "Isha",
      "time": "2026-10-08T14:04:00.000Z",
      "timeRemainingSeconds": 905,
      "timeRemainingFormatted": "15m"
    }
  }
}
```

---

### 2. Log Prayer Status
`POST /api/prayer/log`

- **Evaluation Rules**:
  - `"on_time"`: Logged within first 30–40 minutes of prayer start (`PRIME_WINDOW_MINUTES`).
  - `"late"`: Logged after prime window, before prayer end time.
  - `"missed"`: Logged after prayer window has expired.

**Request Body**:
```json
{
  "userId": "user_123",
  "prayerName": "maghrib",
  "prayerStartTime": "2026-10-08T18:20:00.000Z",
  "prayerEndTime": "2026-10-08T19:35:00.000Z",
  "logTimestamp": "2026-10-08T18:30:00.000Z"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Prayer maghrib logged successfully as \"on_time\".",
  "data": {
    "record": {
      "id": 1,
      "user_id": "user_123",
      "prayer_name": "maghrib",
      "date": "2026-10-08",
      "status": "on_time",
      "logged_at": "2026-10-08T18:30:00.000Z"
    },
    "evaluation": {
      "status": "on_time",
      "message": "Logged on time within prime 35-minute window.",
      "minutesSinceStart": 10,
      "minutesUntilEnd": 65
    },
    "relevantHadith": {
      "title": "Dearest Deeds to Allah",
      "arabic": "عَنْ عَبْدِ اللَّهِ بْنِ مَسْعُودٍ...",
      "english": "To perform prayer at its proper earliest time.",
      "reference": "Sahih al-Bukhari #527"
    }
  }
}
```

---

### 3. Fetch Hadith Tailored to Status
`GET /api/hadith?status={on_time|late|missed}`

- **Sample Request**: `GET http://localhost:4000/api/hadith?status=late`

**Response**:
```json
{
  "success": true,
  "data": {
    "status": "late",
    "hadith": {
      "id": "late-1",
      "title": "Warning Against Delaying Prayer Carelessly",
      "arabic": "عَنْ أَنَسٍ رَضِيَ اللَّهُ عَنْهُ قَالَ: سَمِعْتُ رَسُولَ اللَّهِ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ يَقُولُ: «تِلْكَ صَلَاةُ الْمُنَافِقِ...»",
      "english": "That is the prayer of the hypocrite: he sits watching the sun until it is between the horns of the devil, then he gets up and pecks four rak'ahs...",
      "reference": "Sahih Muslim #622"
    }
  }
}
```

---

### 4. Fetch User Stats & Streaks
`GET /api/user/:id/stats`

**Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "name": "User-user_1"
    },
    "streak": {
      "currentStreakDays": 5,
      "description": "5 days streak"
    },
    "weeklySummary": {
      "totalLogged": 25,
      "completedTotal": 23,
      "onTimeCount": 19,
      "lateCount": 4,
      "missedCount": 2,
      "onTimePercentage": 83,
      "weeklyCompletionRate": 66
    },
    "last7Days": [
      {
        "date": "2026-10-08",
        "dayCompletedCount": 4,
        "completionRate": 80,
        "prayers": [...]
      }
    ]
  }
}
```
