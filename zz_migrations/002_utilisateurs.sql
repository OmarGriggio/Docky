CREATE TABLE IF NOT EXISTS public.utilisateurs
(
    id SERIAL PRIMARY KEY,
    nom character varying(100) COLLATE pg_catalog."default",
    prenom character varying(100) COLLATE pg_catalog."default",
    email character varying(255) COLLATE pg_catalog."default" NOT NULL,
    motdepasse_hash text COLLATE pg_catalog."default" NOT NULL,
    date_creat timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_modif timestamp without time zone,
    CONSTRAINT utilisateurs_email_key UNIQUE (email)
)