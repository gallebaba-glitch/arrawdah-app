# Ar Rawdah Travel Tour — Application de gestion

Application web de gestion d'agence Oumrah.
Stack : Next.js + Supabase + Tailwind CSS

---

## 🚀 DÉPLOIEMENT EN 5 ÉTAPES

### ÉTAPE 1 — Créer la base de données Supabase (5 min)

1. Va sur **supabase.com** → créer un compte gratuit
2. Crée un nouveau projet (note le mot de passe)
3. Va dans **SQL Editor** → colle le contenu de `supabase-schema.sql` → clique Run
4. Va dans **Settings > API** → copie :
   - `Project URL`
   - `anon public key`

### ÉTAPE 2 — Configurer les variables d'environnement

Crée un fichier `.env.local` à la racine :
```
NEXT_PUBLIC_SUPABASE_URL=https://ton-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=ta-clé-anon
```

### ÉTAPE 3 — Uploader sur GitHub

1. Crée un compte sur **github.com**
2. Crée un nouveau repository : `arrawdah-app`
3. Upload tous les fichiers de ce dossier
4. Commit

### ÉTAPE 4 — Déployer sur Vercel

1. Va sur **vercel.com** → Sign up with GitHub
2. Clique **Add New Project** → importe `arrawdah-app`
3. Dans **Environment Variables**, ajoute :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Clique **Deploy**

### ÉTAPE 5 — C'est en ligne ! 🎉

Tu as une URL du type : `arrawdah-app.vercel.app`

---

## 📁 STRUCTURE DU PROJET

```
arrawdah-next/
├── pages/
│   ├── index.js        → Dashboard
│   ├── pelerins.js     → Gestion pèlerins
│   ├── departs.js      → Gestion départs
│   ├── finances.js     → Module financier
│   └── documents.js    → Documents & Visas
├── components/
│   ├── Layout.js       → Sidebar + topbar
│   └── Modal.js        → Modal réutilisable
├── lib/
│   └── supabase.js     → Client Supabase
├── styles/
│   └── globals.css     → Tailwind + styles
├── supabase-schema.sql → SQL à exécuter dans Supabase
└── .env.example        → Variables d'environnement
```

---

## 🛠️ DÉVELOPPEMENT LOCAL

```bash
npm install
cp .env.example .env.local
# Remplir .env.local avec vos clés Supabase
npm run dev
# Ouvre http://localhost:3000
```

---

## 📞 SUPPORT

Application créée pour Ar Rawdah Travel Tour — Rawda Sherif SARL
Fondée par Hajja Mamy Fall
