// System 2030 AI – Render Edition (BlackGold vFinal.4)
// Pełny serwer Node.js: PostgreSQL + Backup + PDF + Kierownik + Operator
// Autor: Robert & GPT-5 Team 2025

import express from "express";
import cors from "cors";
import { Pool } from "pg";
import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use("/public", express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 8080;
const DATABASE_URL = process.env.DATABASE_URL;

// połączenie z bazą PostgreSQL
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL ? { rejectUnauthorized: false } : false,
});

// tworzymy katalogi backupów, jeśli nie istnieją
const BACKUP_DIR = path.join(__dirname, "data", "backups");
const MONTHLY_DIR = path.join(__dirname, "data", "monthly");
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
if (!fs.existsSync(MONTHLY_DIR)) fs.mkdirSync(MONTHLY_DIR, { recursive: true });

// ========== 1️⃣ Inicjalizacja bazy danych ==========
async function initDb() {
  await pool.query(`CREATE TABLE IF NOT EXISTS operators(
    id SERIAL PRIMARY KEY,
    code TEXT UNIQUE,
    name TEXT,
    site TEXT,
    role TEXT
  );`);

  await pool.query(`CREATE TABLE IF NOT EXISTS sites(
    id SERIAL PRIMARY KEY,
    name TEXT,
    location TEXT,
    status TEXT
  );`);

  await pool.query(`CREATE TABLE IF NOT EXISTS reports(
    id SERIAL PRIMARY KEY,
    operator_code TEXT,
    operator_name TEXT,
    site TEXT,
    date TEXT,
    hours NUMERIC,
    notes TEXT,
    status TEXT
  );`);

  await pool.query(`CREATE TABLE IF NOT EXISTS attendance(
    id SERIAL PRIMARY KEY,
    operator_code TEXT,
    operator_name TEXT,
    date TEXT,
    declared_at TEXT,
    status TEXT,
    note TEXT,
    late BOOLEAN
  );`);

  await pool.query(`CREATE TABLE IF NOT EXISTS finances(
    id SERIAL PRIMARY KEY,
    contractor TEXT,
    site TEXT,
    amount NUMERIC,
    cost NUMERIC,
    profit NUMERIC
  );`);

  // dane startowe
  const res = await pool.query("SELECT COUNT(*) FROM operators;");
  if (Number(res.rows[0].count) === 0) {
    await pool.query(`
      INSERT INTO operators(code,name,site,role) VALUES
      ('OP-001','Jan Kowalski','Budowa A','operator'),
      ('OP-002','Adam Nowak','Budowa A','operator'),
      ('KIER-001','Piotr Kierownik','Budowa A','kierownik'),
      ('ADMIN-001','Administrator',NULL,'admin');
    `);
  }
  const res2 = await pool.query("SELECT COUNT(*) FROM sites;");
  if (Number(res2.rows[0].count) === 0) {
    await pool.query(`
      INSERT INTO sites(name,location,status) VALUES
      ('Budowa A','Warszawa','aktywna'),
      ('Budowa B','Piaseczno','aktywna');
    `);
  }
}

// ========== 2️⃣ Backupy i raporty miesięczne ==========
async function makeBackup() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const all = {};
  for (const table of ["operators", "sites", "reports", "attendance", "finances"]) {
    const r = await pool.query(`SELECT * FROM ${table};`);
    all[table] = r.rows;
  }
  const backupPath = path.join(BACKUP_DIR, `db-${stamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(all, null, 2), "utf-8");
  cleanupOldBackups();
  maybeCreateMonthly(all);
}

function cleanupOldBackups() {
  const files = fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith("db-"));
  if (files.length > 30) {
    const toDelete = files.sort().slice(0, files.length - 30);
    toDelete.forEach(f => fs.unlinkSync(path.join(BACKUP_DIR, f)));
  }
}

function maybeCreateMonthly(all) {
  const now = new Date();
  if (now.getDate() !== 1) return;
  const monthStamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthlyPath = path.join(MONTHLY_DIR, `db-monthly-${monthStamp}.json`);
  if (!fs.existsSync(monthlyPath)) {
    const summary = buildMonthlySummary(all, monthStamp);
    fs.writeFileSync(monthlyPath, JSON.stringify(summary, null, 2), "utf-8");
    const pdfPath = path.join(MONTHLY_DIR, `raport-${monthStamp}.pdf`);
    createPdfReport(summary, pdfPath);
  }
}

function buildMonthlySummary(all, monthStamp) {
  const reports = all.reports || [];
  const attendance = all.attendance || [];
  const finances = all.finances || [];
  const totalProfit = finances.reduce((s, f) => s + Number(f.profit || 0), 0);

  return {
    title: "System 2030 AI – Raport Operacyjny",
    period: monthStamp,
    totalReports: reports.length,
    totalAttendance: attendance.length,
    totalFinances: finances.length,
    totalOperationalProfit: totalProfit,
    generatedAt: new Date().toISOString(),
    sign: "Wygenerowano automatycznie przez System 2030 AI (BlackGold)"
  };
}

function createPdfReport(summary, pdfPath) {
  const doc = new PDFDocument();
  const stream = fs.createWriteStream(pdfPath);
  doc.pipe(stream);

  doc.rect(0, 0, 600, 60).fill("#d4af37");
  doc.fillColor("#000").fontSize(18).text("System 2030 AI – Raport Operacyjny", 20, 20);
  doc.moveDown(2);
  doc.fillColor("#fff").fontSize(12);
  doc.text(`Okres: ${summary.period}`);
  doc.text(`Raportów: ${summary.totalReports}`);
  doc.text(`Obecności: ${summary.totalAttendance}`);
  doc.text(`Pozycji finansowych: ${summary.totalFinances}`);
  doc.text(`Zysk operacyjny: ${summary.totalOperationalProfit} PLN`);
  doc.moveDown();
  doc.text(summary.sign, { align: "right" });
  doc.end();
}

// ========== 3️⃣ API ==========
app.get("/api/operators", async (req, res) => {
  const r = await pool.query("SELECT * FROM operators ORDER BY id;");
  res.json(r.rows);
});
app.post("/api/operators", async (req, res) => {
  const { code, name, site, role } = req.body;
  const r = await pool.query(
    "INSERT INTO operators(code,name,site,role) VALUES($1,$2,$3,$4) RETURNING *;",
    [code, name, site, role]
  );
  await makeBackup();
  res.json(r.rows[0]);
});

app.get("/api/sites", async (req, res) => {
  const r = await pool.query("SELECT * FROM sites ORDER BY id;");
  res.json(r.rows);
});
app.post("/api/sites", async (req, res) => {
  const { name, location, status } = req.body;
  const r = await pool.query(
    "INSERT INTO sites(name,location,status) VALUES($1,$2,$3) RETURNING *;",
    [name, location, status]
  );
  await makeBackup();
  res.json(r.rows[0]);
});

app.get("/api/reports", async (req, res) => {
  const r = await pool.query("SELECT * FROM reports ORDER BY id DESC;");
  res.json(r.rows);
});
app.post("/api/reports", async (req, res) => {
  const { operator_code, operator_name, site, date, hours, notes, status } = req.body;
  const r = await pool.query(
    "INSERT INTO reports(operator_code,operator_name,site,date,hours,notes,status) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *;",
    [operator_code, operator_name, site, date, hours, notes, status || "oczekuje"]
  );
  await makeBackup();
  res.json(r.rows[0]);
});
app.put("/api/reports/:id/approve", async (req, res) => {
  const id = req.params.id;
  const r = await pool.query("UPDATE reports SET status='zatwierdzony' WHERE id=$1 RETURNING *;", [id]);
  await makeBackup();
  res.json(r.rows[0]);
});

app.get("/api/attendance", async (req, res) => {
  const r = await pool.query("SELECT * FROM attendance ORDER BY id DESC;");
  res.json(r.rows);
});
app.post("/api/attendance", async (req, res) => {
  const { operator_code, operator_name, date, declared_at, status, note, late } = req.body;
  const r = await pool.query(
    "INSERT INTO attendance(operator_code,operator_name,date,declared_at,status,note,late) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *;",
    [operator_code, operator_name, date, declared_at, status, note, late]
  );
  await makeBackup();
  res.json(r.rows[0]);
});

app.get("/api/finances", async (req, res) => {
  const r = await pool.query("SELECT * FROM finances ORDER BY id DESC;");
  res.json(r.rows);
});
app.post("/api/finances", async (req, res) => {
  const { contractor, site, amount, cost } = req.body;
  const profit = Number(amount || 0) - Number(cost || 0);
  const r = await pool.query(
    "INSERT INTO finances(contractor,site,amount,cost,profit) VALUES($1,$2,$3,$4,$5) RETURNING *;",
    [contractor, site, amount, cost, profit]
  );
  await makeBackup();
  res.json(r.rows[0]);
});

app.get("/api/monthly", (req, res) => {
  const files = fs.readdirSync(MONTHLY_DIR).filter(f => f.endsWith(".json") || f.endsWith(".pdf")).sort().reverse();
  res.json(files);
});

// ========== 4️⃣ Start ==========
await initDb();
app.listen(PORT, () => console.log("✅ System 2030 AI – Render Edition uruchomiony na porcie " + PORT));
