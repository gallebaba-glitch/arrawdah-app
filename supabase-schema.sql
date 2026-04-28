-- ══════════════════════════════════════════
-- SCHÉMA SUPABASE — Ar Rawdah Travel Tour
-- Copiez-collez ce SQL dans Supabase > SQL Editor
-- ══════════════════════════════════════════

-- Table des départs
CREATE TABLE departs (
  id          BIGSERIAL PRIMARY KEY,
  nom         TEXT NOT NULL,
  date_greg   DATE,
  date_heg    TEXT,
  duree       INTEGER DEFAULT 14,
  max_pelerins INTEGER DEFAULT 40,
  vol         TEXT DEFAULT 'À confirmer',
  hotel_mecque TEXT DEFAULT 'À confirmer',
  hotel_medine TEXT DEFAULT 'À confirmer',
  guide       TEXT DEFAULT 'À désigner',
  statut      TEXT DEFAULT 'preparation'
                CHECK (statut IN ('preparation','confirme','parti','rentre')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Table des pèlerins
CREATE TABLE pelerins (
  id            BIGSERIAL PRIMARY KEY,
  prenom        TEXT NOT NULL,
  nom           TEXT NOT NULL,
  telephone     TEXT,
  tel_famille   TEXT,
  date_naissance DATE,
  formule       TEXT DEFAULT 'ZEN' CHECK (formule IN ('ZEN','ELITE')),
  prix_total    INTEGER DEFAULT 1300000,
  montant_paye  INTEGER DEFAULT 0,
  depart_id     BIGINT REFERENCES departs(id) ON DELETE SET NULL,
  num_passeport TEXT,
  exp_passeport DATE,
  medical       TEXT DEFAULT 'Aucun',
  statut        TEXT DEFAULT 'inscrit'
                CHECK (statut IN ('inscrit','confirme','parti','rentre')),
  -- Documents
  doc_passeport BOOLEAN DEFAULT FALSE,
  doc_photo     BOOLEAN DEFAULT FALSE,
  doc_vaccin    BOOLEAN DEFAULT FALSE,
  doc_visa      BOOLEAN DEFAULT FALSE,
  doc_billet    BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les recherches
CREATE INDEX idx_pelerins_depart ON pelerins(depart_id);
CREATE INDEX idx_pelerins_statut ON pelerins(statut);
CREATE INDEX idx_departs_statut  ON departs(statut);

-- Activer Row Level Security (RLS) - lecture publique pour commencer
ALTER TABLE pelerins ENABLE ROW LEVEL SECURITY;
ALTER TABLE departs  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Accès libre pèlerins"  ON pelerins FOR ALL USING (true);
CREATE POLICY "Accès libre départs"   ON departs  FOR ALL USING (true);
