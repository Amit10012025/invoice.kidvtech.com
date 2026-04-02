# KIDV Invoice — Firebase → Supabase Migration Guide
## Complete Setup in 4 Steps

---

## 🔧 STEP 1: Supabase Account & Project

1. **supabase.com** → Sign Up (free)
2. **New Project** → Name: `kidv-invoice` → Password set karo (yaad rakho!) → Region: `Southeast Asia (Singapore)`
3. Wait ~2 minutes for setup

### Keys lavo (important!):
- Dashboard → **Settings → API**
- Copy: `Project URL` → `SUPABASE_URL`
- Copy: `anon/public` key → `SUPABASE_ANON_KEY`
- Copy: `service_role` key → `SUPABASE_SERVICE_KEY` (backend only — share NAKARO)

---

## 🗄️ STEP 2: Database Schema Run karo

1. Supabase Dashboard → **SQL Editor** → **New Query**
2. `schema.sql` file no content paste karo
3. **Run** click karo
4. "KIDV Invoice schema created successfully!" message aave → Done ✅

### Google OAuth setup:
1. Supabase → **Authentication → Providers → Google → Enable**
2. **console.cloud.google.com** → New Project
3. APIs & Services → OAuth consent screen → External → fill info
4. Credentials → Create OAuth Client ID → Web application
   - Authorized redirect URIs: `https://xxxx.supabase.co/auth/v1/callback`
5. Client ID + Secret → Supabase ma paste karo

### Email settings (Supabase thi email aave):
- Authentication → **Email Templates** → Confirm signup template customize karo
- Default thi aave che — production ma custom SMTP (SendGrid) use karo

---

## 🐍 STEP 3: FastAPI Backend Setup

```bash
# 1. Project folder
mkdir kidv-backend && cd kidv-backend

# 2. Python virtual environment
python -m venv venv

# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# 3. Dependencies install
pip install -r requirements.txt

# 4. .env file banavo
cp .env.example .env
# .env file open karo ne values mukho:
# SUPABASE_URL=https://xxxxx.supabase.co
# SUPABASE_ANON_KEY=eyJ...
# SUPABASE_SERVICE_KEY=eyJ...

# 5. Run karo
uvicorn main:app --reload

# Browser ma kholo:
# http://localhost:8000       → API running check
# http://localhost:8000/docs  → Interactive API docs (Swagger)
```

---

## 🌐 STEP 4: Frontend Update karo

### supabase-config.js ma values mukho:
```javascript
const SUPABASE_URL  = 'https://xxxx.supabase.co';   // apano URL
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiI...';     // anon key
const API_BASE      = 'http://localhost:8000';        // backend URL
```

### login.html ma pan values update karo:
```javascript
const SUPABASE_URL  = 'https://xxxx.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiI...';
```

### Firebase remove karo — **EVERY HTML FILE ma**:
```html
<!-- AA 3 lines REMOVE karo: -->
<script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js"></script>

<!-- firebase-config.js REPLACE karo supabase-config.js thi: -->
<!-- OLD: <script src="firebase-config.js"></script>       -->
<!-- NEW: <script src="supabase-config.js"></script>       -->
```

---

## ☁️ STEP 5: Backend Deploy (Free)

### Railway.app (recommended — easiest):
1. railway.app → Login with GitHub
2. New Project → Deploy from GitHub repo
3. Variables add karo (same as .env)
4. Auto-deploy → URL milse: `https://kidv-backend.railway.app`
5. `supabase-config.js` ma `API_BASE` update karo

### Render.com (alternative):
1. render.com → New Web Service
2. GitHub connect karo
3. Build Command: `pip install -r requirements.txt`
4. Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Environment variables add karo

---

## ✅ KIDV.list(), KIDV.add() — Same API Kaam Karse

```javascript
// Aa code pehela jevo j kaam karse — koi change nahi!
const clients = await KIDV.list('clients');
const newClient = await KIDV.add('clients', { name: 'Mehta Traders', gstin: '24AABCM...' });
await KIDV.set('clients', id, { name: 'Updated Name' });
await KIDV.delete('clients', id);

// Settings pan same:
const company = await KIDV.getSettings('company');
await KIDV.saveSettings('company', { name: 'My Business' });
```

---

## 🔄 Firebase → Supabase Data Migration

Jare switch karo tyare existing Firestore data migrate karvano hoy to:

```python
# migration_script.py — ek vaar run karo
import firebase_admin
from firebase_admin import credentials, firestore
from supabase import create_client
import os

# Firebase init
cred = credentials.Certificate('firebase-service-account.json')
firebase_admin.initialize_app(cred)
fs = firestore.client()

# Supabase init
sb = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_KEY'))

# Users get karo
users = fs.collection('users').stream()
for user in users:
    data = user.to_dict()
    uid = user.id
    
    # Each user na collections migrate karo
    for col in ['clients', 'invoices', 'payments', 'products', 'suppliers']:
        docs = fs.collection(f'users/{uid}/{col}').stream()
        for doc in docs:
            row = {**doc.to_dict(), 'user_id': uid}
            row.pop('_id', None)
            try:
                sb.table(col).insert(row).execute()
                print(f'Migrated {col}/{doc.id}')
            except Exception as e:
                print(f'Error {col}/{doc.id}: {e}')

print('Migration complete!')
```

---

## 📊 Comparison: Firebase vs Supabase

| Feature | Firebase | Supabase |
|---------|----------|----------|
| Database | NoSQL (Firestore) | PostgreSQL (relational) |
| Free Tier | 1GB storage, 50k reads/day | 500MB, unlimited reads |
| Auth | ✅ Built-in | ✅ Built-in |
| Google OAuth | ✅ | ✅ |
| Email Verification | ✅ | ✅ |
| Vendor Lock-in | ❌ Google-only | ✅ Open source |
| SQL Queries | ❌ | ✅ |
| Row Level Security | Basic rules | ✅ PostgreSQL RLS |
| Price (paid) | Expensive | Affordable |
| Self-host | ❌ | ✅ |

---

## ❓ FAQ

**Q: Firebase data jaase?**
A: Na. Migration script thi move kari shakay. Pehela Supabase setup karo, pachi migrate karo.

**Q: Supabase free ma ketlu chalse?**
A: 500MB DB + 50,000 monthly active users → 500 businesses mate kaafi che.

**Q: Backend deploy karvano kharch?**
A: Railway free tier: $5/month credit (kaafi che). Render free tier pan available.

**Q: Google OAuth email verification bypass kare?**
A: Haa! Google thi login kare to automatic verified mane. Email/password signup ma verification email aave.

**Q: Existing HTML files ma ketlo change?**
A: Sirf 2 changes: firebase scripts remove karo + supabase-config.js add karo. KIDV.list/add/set/delete API same rahe.
