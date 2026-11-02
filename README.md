# Look 1 Practice 🌟

An interactive, offline-first Progressive Web App (PWA) designed for children learning English (Vocabulary, Phonics, Grammar, and Speaking practice), complete with a teacher dashboard and background synchronization.

---

## 🚀 Features

- **Interactive Voice Teacher (`voice.js`)**:
  - Uses browser Speech Synthesis and Speech Recognition.
  - Word-to-phoneme / sound breakdown (e.g. *bag*, *book*, *crayon*, *pencil*, etc.).
  - "Say it!" speech recognition challenges that listen to the child's pronunciation and provide encouraging teacher feedback.
  - Bilingual support with Arabic audio guidance and praise.
  - Floating mute/unmute toggle.

- **Offline-First PWA (`sw.js`, `manifest.webmanifest`)**:
  - Precached assets and fonts (Andika Latin & Noto Naskh Arabic) for fast offline access.
  - Installable on tablets, phones, and desktops.

- **Seamless Background Progress Sync (`sync.js`)**:
  - Stores learners, activity stars, and item attempts locally in IndexedDB (`look1-practice`).
  - Automatically batches and syncs progress to the cloud backend whenever an internet connection is available.

- **Serverless Cloudflare Backend (`_worker.js`)**:
  - Handles `/api/sync` to persist learner activity into Cloudflare D1.
  - Secure `/api/admin/learners` API with constant-time SHA-256 password verification.

- **Teacher Admin Dashboard (`admin.html`)**:
  - Track learner progress, star counts, activity completion, and accuracy percentages.
  - Inspect most-missed vocabulary items to identify topics needing review.
  - Export learner data to CSV for grading and record keeping.

---

## 🛠️ Cloudflare Pages & D1 Setup

### 1. Create Cloudflare D1 Database
1. Go to **Cloudflare Dashboard** > **Storage & Databases** > **D1**.
2. Click **Create database** and name it (e.g., `look1`).

### 2. Configure Worker / Pages Bindings
1. In **Workers & Pages**, select your Look 1 project > **Settings** > **Bindings**.
2. Click **Add** > **D1 database**:
   - **Variable name**: `DB` *(exact name)*
   - **Database**: Select the D1 database created in Step 1.

### 3. Set Admin Credentials
In the same project settings page under **Variables and Secrets**:
- **Secret**: `ADMIN_PASSWORD` = *(choose your secure teacher password)*
- **Variable** *(optional)*: `ADMIN_USER` = `Teacher` *(defaults to `Teacher` if omitted)*

### 4. Deploy
- Connect this GitHub repository directly to Cloudflare Pages, or upload the build artifacts.
- Once deployed, access the teacher dashboard at:
  ```
  https://YOUR-SITE/admin.html
  ```
  (or `https://YOUR-SITE/admin` via worker routing)

---

## 📁 Repository Structure

```
├── _worker.js             # Cloudflare Pages Functions / Advanced Worker (D1 sync & admin API)
├── admin.html             # Teacher admin dashboard UI
├── assets/                # App bundle (CSS, JS, and Arabic/Latin web fonts)
├── favicon.svg            # Favicon
├── icon-*.png             # PWA app icons (192px, 512px, maskable)
├── index.html             # Main learner practice app entry point
├── manifest.webmanifest   # PWA manifest configuration
├── SETUP.txt              # Quick setup reference notes
├── sw.js                  # Service Worker for offline caching
├── sync.js                # Client-side IndexedDB background sync engine
├── voice.js               # Speech synthesis, phonics mapping, and speech recognition
└── workbox-*.js           # Workbox runtime support
```
