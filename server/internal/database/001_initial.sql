CREATE TABLE users (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'CITIZEN' CHECK (role IN ('CITIZEN', 'ADMIN')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sessions (
    token_hash CHAR(64) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX sessions_expires_at_idx ON sessions (expires_at);

CREATE TABLE incidents (
    id UUID PRIMARY KEY,
    reference TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL CHECK (category IN (
        'Internet lenta', 'Sem ligação', 'Interrupções frequentes',
        'Cobertura insuficiente', 'Instabilidade', 'Outro'
    )),
    description TEXT NOT NULL CHECK (char_length(description) BETWEEN 12 AND 500),
    provider TEXT NOT NULL DEFAULT '',
    province TEXT NOT NULL,
    municipality TEXT NOT NULL,
    neighborhood TEXT NOT NULL DEFAULT '',
    latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -18.1 AND -4.2),
    longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN 11.6 AND 24.1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'Recebido' CHECK (status IN ('Recebido', 'Em análise', 'Classificado', 'Encerrado')),
    ai_classification TEXT NOT NULL DEFAULT 'A aguardar análise',
    owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    attachment BYTEA,
    attachment_type TEXT,
    attachment_name TEXT,
    CHECK (
        (attachment IS NULL AND attachment_type IS NULL AND attachment_name IS NULL)
        OR (attachment IS NOT NULL AND attachment_type IS NOT NULL AND attachment_name IS NOT NULL)
    )
);
CREATE INDEX incidents_created_at_idx ON incidents (created_at DESC);
CREATE INDEX incidents_province_idx ON incidents (province);
CREATE INDEX incidents_owner_user_id_idx ON incidents (owner_user_id, created_at DESC);

CREATE TABLE incident_history (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('Recebido', 'Em análise', 'Classificado', 'Encerrado')),
    note TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX incident_history_incident_idx ON incident_history (incident_id, created_at);
