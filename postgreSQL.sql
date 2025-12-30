-- PostgreSQL Database Script
-- Database: Bug_Bounty

BEGIN;

-- Function to handle auto-updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 1. TABLE: bounty_programs
CREATE TABLE "bounty_programs" (
    "id_prog" SERIAL PRIMARY KEY,
    "Title" VARCHAR(100),
    "Link" VARCHAR(100),
    "Icon" VARCHAR(200),
    "Details" TEXT,
    "Low" TEXT,
    "Medium" TEXT,
    "High" INTEGER,
    "Critical" INTEGER,
    "Oout" TEXT,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABLE: main (Admin)
CREATE TABLE "main" (
    "id" SERIAL PRIMARY KEY,
    "user_name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL UNIQUE,
    "password" VARCHAR(255) NOT NULL
);

-- 3. TABLE: users (UNIFIED: Login + Profile)
CREATE TABLE "users" (
    "id" SERIAL PRIMARY KEY,
    -- Auth Info
    "username" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL UNIQUE,
    "password_hash" VARCHAR(255) NOT NULL,
    "is_blocked" BOOLEAN DEFAULT FALSE,
    "warning" INTEGER DEFAULT 0,
    -- Profile Info
    "first_name" VARCHAR(255) DEFAULT '',
    "last_name" VARCHAR(255) DEFAULT '',
    "phoneNumber" VARCHAR(20) DEFAULT '',
    "Telegram" VARCHAR(100) DEFAULT '',
    "X" VARCHAR(200) DEFAULT '',
    "Linkedin" VARCHAR(200) DEFAULT '',
    "payment_method" VARCHAR(255) DEFAULT '',
    "profile_pic_url" VARCHAR(255) DEFAULT '',
    "about" TEXT DEFAULT '',
    "account_address" VARCHAR(255) DEFAULT '',
    "Total_Reward" DOUBLE PRECISION DEFAULT 0,
    -- Timestamps
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABLE: submit
CREATE TABLE "submit" (
    "id" SERIAL PRIMARY KEY,
    "user_id" INTEGER,
    "post_id" INTEGER,
    "Title" VARCHAR(100),
    "End_point" VARCHAR(100),
    "Weakness" VARCHAR(200),
    "Types" VARCHAR(200),
    "Cvss" VARCHAR(200),
    "Score" DOUBLE PRECISION,
    "Proof" TEXT,
    "Impact" TEXT,
    "Recommended" TEXT,
    "Status" VARCHAR(200),
    "Files" TEXT,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "Reward" DOUBLE PRECISION,
    CONSTRAINT fk_submit_user FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL
);

-- Triggers for updated_at
CREATE TRIGGER update_users_modtime BEFORE UPDATE ON "users" FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_bounty_programs_modtime BEFORE UPDATE ON "bounty_programs" FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_submit_modtime BEFORE UPDATE ON "submit" FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- DUMPING DATA

-- Bounty Programs
INSERT INTO "bounty_programs" ("id_prog", "Title", "Link", "Icon", "Details", "Low", "Medium", "High", "Critical", "Oout", "created_at", "updated_at") VALUES
(3, 'Chapa', 'https://chapa.co/', 'http://localhost:5000/uploads/1723843866192-425aee81-6ca1-4282-ab18-bb1d59fdea05_1704500949730.jpg', '<p>This program is for the disclosure of software security vulnerabilities only.</p>', '3000', '10000', 20000, 50000, '<ul><li>In-Scope Domains: *.chapa.co</li></ul>', '2024-08-16 21:31:26', '2024-08-16 21:31:26'),
(4, 'Ethiopian Airlines', 'https://www.ethiopianairlines.com/', 'http://localhost:5000/uploads/1723844466355-4af335d2-0b94-4a2c-ab1f-323f7c4e6400_now.jpg', '<h3>Program Overview</h3>', '8000', '31000', 56000, 85000, '<p>In scope...</p>', '2024-08-16 21:48:23', '2024-08-16 21:48:23'),
(5, 'Ethio Post', 'https://ethio.post/', 'http://localhost:5000/uploads/1723845544531-f9da6d3b-2dbd-4d16-bf4f-7bba6854fb5c_images.png', '<h3>Overview</h3>', '5000', '10000', 20000, 40000, '<p>In scope...</p>', '2024-08-16 22:01:41', '2024-08-16 22:01:41'),
(6, 'Bank of Abyssinia', 'https://www.bankofabyssinia.com/', 'http://localhost:5000/uploads/1723846964168-a34b16d6-e886-49cb-a3ac-4d2e55780192_images (1).png', '<h3></h3>', '25000', '75000', 200000, 300000, '<p>In scope...</p>', '2024-08-16 22:24:46', '2024-08-16 22:24:46'),
(7, 'INSA', 'https://www.insa.gov.et/', 'http://localhost:5000/uploads/1723847865263-41ee8ba1-1337-40aa-b627-893a49e2a1a3_images (2).png', '<h3></h3>', '28000', '51000', 78000, 90000, '<p>In scope...</p>', '2024-08-16 22:41:26', '2024-08-16 22:41:26');

-- Main Admin
INSERT INTO "main" ("id", "user_name", "email", "password") VALUES
(1, 'a1etadmin', 'a1etadmin@gmail.com', '$2a$10$.LoF5p549cdYONpqKayB2OYNcEdtwkJ1nKhHRbiaBlP6Mf9hrwP92');

-- Users (Merged)
INSERT INTO "users" ("id", "username", "email", "password_hash", "is_blocked", "first_name", "last_name", "phoneNumber", "Telegram", "X", "Linkedin", "payment_method", "profile_pic_url", "about", "account_address", "warning", "Total_Reward") VALUES
(1, 'Mekonnen', 'Mekonnen.Demeke@gmail.com', '$2a$10$ARSbx/oUP7PdyL8Q6rUXIO7SZXBmRAqbjwF9QdAhXpsT/yIx1phKq', TRUE, 'Mekonnen', '', '', '', '', '', '', 'http://localhost:5000/uploads/1723757208986.png', '', '', 0, 0),
(2, 'Betelhem', 'BetelhemDesta@gmail.com', '$2a$10$TEgWtbA.jFfbxZxSu.uLH.SzdC9FDCQmrrqdIgcY7tyOeSakyWF1.', FALSE, 'Betelhem', 'Desta', '251925633259', '', '', '', 'Telebirr', 'http://localhost:5000/uploads/1723878994992.png', 'Let''s do it together!', '251925633259', 0, 0),
(3, 'Fikre', 'FikreGebre@gmail.com', '$2a$10$QSxw1lRAK7JuNoyD/D0syu6kXgUa/KOCPPt/6XSkqwevRNJEzhJMO', FALSE, 'Fikre', '', '251925566884', '', '', '', 'Telebirr', 'http://localhost:5000/uploads/1723879292779.png', 'Challenge us', '251925566884', 0, 0),
(4, 'Eleni', 'Eleni.Hagos@gmail.com', '$2a$10$yf06y0SSMSlAk9S4tUjiCO6bvsc/FLaZZJcJqpDlQ9hmEhhnJA7E6', FALSE, 'Eleni', 'Hagos', '251925566884', '', '', '', 'Hello Cash', 'http://localhost:5000/uploads/1723879587672.png', 'What a Platform.', '251945855691', 0, 0),
(5, 'Kassahun', 'KassahunMekonnen99@gmail.com', '$2a$10$YWvTfDKIXb29OiYrliSKjOMw8HZbHuNBlrikxMA31lZs50W61oZtC', FALSE, 'Kassahun', 'Mekonnen', '251973977828', '@Kassahun', '@Kassahun99', '', 'Awash Mobile Banking', 'http://localhost:5000/uploads/1723879300646.jpg', '', '013345897612233', 0, 0),
(6, 'Rahel', 'RahelYared01@gmail.com', '$2a$10$huuiV0kuvkF7DIZMiLkmiOXxLmWM5fkoIFpk5Jn788pbsQhzsTMdm', FALSE, 'Rahel', 'Yared', '25112033915', '@RICH', '@RICHyared', '', 'Abysinia Bank', '', '', '2234227905', 0, 0);

-- Reset Sequences (Crucial for Postgres)
SELECT setval('bounty_programs_id_prog_seq', (SELECT MAX("id_prog") FROM "bounty_programs"));
SELECT setval('main_id_seq', (SELECT MAX("id") FROM "main"));
SELECT setval('users_id_seq', (SELECT MAX("id") FROM "users"));
SELECT setval('submit_id_seq', COALESCE((SELECT MAX("id") FROM "submit"), 1), false);

COMMIT;