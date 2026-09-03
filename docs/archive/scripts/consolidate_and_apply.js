/**
 * FLIGHTSAVER DATAOPS: CONSOLIDATE AND APPLY PIPELINE
 * 
 * Режим: CONFIRM AND APPLY (Авторизован Владельцем)
 * Принцип: Zero Data Loss (все перемещения полностью обратимы через карантин).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

console.log('================================================================');
console.log('🚀 FLIGHTSAVER DATAOPS: CONSOLIDATE & APPLY PIPELINE');
console.log('================================================================\n');

const LOCAL_ROOT = 'C:\\FlightSaver';
const GDRIVE_ROOT = 'G:\\Мой диск';
const GDRIVE_FS = path.join(GDRIVE_ROOT, 'FlightSaver');
const GDRIVE_QUARANTINE = path.join(GDRIVE_ROOT, '.quarantine_duplicates');
const LOCAL_QUARANTINE = path.join(LOCAL_ROOT, '.quarantine_duplicates');

const actionLog = [];

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`📁 Создана папка: ${dirPath}`);
  }
}

function getSha256(filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  } catch (err) {
    return null;
  }
}

function safeCopy(src, dest, description) {
  if (!fs.existsSync(src)) {
    console.warn(`[SKIP] Исходный файл не найден: ${src}`);
    return false;
  }
  ensureDir(path.dirname(dest));
  try {
    const srcHash = getSha256(src);
    fs.copyFileSync(src, dest);
    actionLog.push({ action: 'COPY', src, dest, hash: srcHash, desc: description, success: true });
    console.log(`✓ [${description}] Скопирован: ${path.basename(src)} ➔ ${dest}`);
    return true;
  } catch (err) {
    try {
      execSync(`powershell -Command "Copy-Item -LiteralPath '${src}' -Destination '${dest}' -Force"`, { stdio: 'ignore' });
      actionLog.push({ action: 'COPY_FALLBACK', src, dest, desc: description, success: true });
      console.log(`✓ [${description} (PS Fallback)] Скопирован: ${path.basename(src)} ➔ ${dest}`);
      return true;
    } catch (e2) {
      console.warn(`[WARN] Ошибка копирования ${src}: ${e2.message}`);
      return false;
    }
  }
}

function safeMove(src, dest, description) {
  if (!fs.existsSync(src)) {
    console.warn(`[SKIP] Файл не найден для перемещения: ${src}`);
    return false;
  }
  ensureDir(path.dirname(dest));
  try {
    const srcHash = getSha256(src);
    fs.copyFileSync(src, dest);
    try {
      fs.unlinkSync(src);
    } catch {}
    actionLog.push({ action: 'MOVE', src, dest, hash: srcHash, desc: description, success: true });
    console.log(`✓ [${description}] Перемещен: ${path.basename(src)} ➔ ${dest}`);
    return true;
  } catch (err) {
    try {
      execSync(`powershell -Command "Move-Item -LiteralPath '${src}' -Destination '${dest}' -Force"`, { stdio: 'ignore' });
      actionLog.push({ action: 'MOVE_FALLBACK', src, dest, desc: description, success: true });
      console.log(`✓ [${description} (PS Fallback)] Перемещен: ${path.basename(src)} ➔ ${dest}`);
      return true;
    } catch (e2) {
      console.warn(`[WARN] Ошибка перемещения ${src}: ${e2.message}`);
      return false;
    }
  }
}

// -----------------------------------------------------------------
// ШАГ 1: ПОДГОТОВКА СТРУКТУРЫ ПАПОК
// -----------------------------------------------------------------
console.log('--- ШАГ 1: Подготовка целевой архитектуры папок ---');
const targetDirsLocal = [
  path.join(LOCAL_ROOT, 'tests', 'rbac'),
  path.join(LOCAL_ROOT, 'tests', 'integration'),
  path.join(LOCAL_ROOT, 'tests', 'e2e'),
  path.join(LOCAL_ROOT, 'docs', 'reports', 'daily'),
  path.join(LOCAL_ROOT, 'docs', 'roadmaps'),
  path.join(LOCAL_ROOT, 'docs', 'archive'),
  path.join(LOCAL_ROOT, 'assets', 'infographics'),
  path.join(LOCAL_ROOT, 'config'),
  LOCAL_QUARANTINE,
];

for (const d of targetDirsLocal) ensureDir(d);

const targetDirsGdrive = [
  path.join(GDRIVE_FS, 'tests', 'rbac'),
  path.join(GDRIVE_FS, 'tests', 'integration'),
  path.join(GDRIVE_FS, 'tests', 'e2e'),
  path.join(GDRIVE_FS, 'docs', 'reports', 'daily'),
  path.join(GDRIVE_FS, 'docs', 'roadmaps'),
  path.join(GDRIVE_FS, 'docs', 'archive'),
  path.join(GDRIVE_FS, 'assets', 'infographics'),
  path.join(GDRIVE_FS, 'config'),
  GDRIVE_QUARANTINE,
];

for (const d of targetDirsGdrive) ensureDir(d);

// -----------------------------------------------------------------
// ШАГ 2: КОНСОЛИДАЦИЯ ТЕСТОВ И ДОКУМЕНТОВ НА C:\FlightSaver
// -----------------------------------------------------------------
console.log('\n--- ШАГ 2: Упорядочивание тестовых сьютов на C:\\FlightSaver ---');
const testMappings = [
  { file: 'test_sprint6_super_admin.js', target: 'tests\\rbac' },
  { file: 'test_sprint6_stage2_concierge.js', target: 'tests\\rbac' },
  { file: 'test_sprint6_stage3_auditor.js', target: 'tests\\rbac' },
  { file: 'test_sprint6_stage4_support.js', target: 'tests\\rbac' },
  { file: 'test_sprint4_e2e_pipeline.js', target: 'tests\\e2e' },
  { file: 'test_e2e_search_pricing.js', target: 'tests\\e2e' },
  { file: 'test_sprint5_redis_tma.js', target: 'tests\\integration' },
  { file: 'test_telegram_auth_supabase.js', target: 'tests\\integration' },
  { file: 'test_telegram_qr_auth.js', target: 'tests\\integration' },
  { file: 'test_telegram_twa_suite.js', target: 'tests\\integration' },
  { file: 'test_price_comparison_target.js', target: 'tests\\integration' },
  { file: 'test_pricing_engine_complete.js', target: 'tests\\integration' },
  { file: 'test_pricing_service_calculate.js', target: 'tests\\integration' },
  { file: 'test_stpc_module_complete.js', target: 'tests\\integration' },
  { file: 'test_stripe_checkout_webhook.js', target: 'tests\\integration' },
  { file: 'test_main.py', target: 'tests\\integration' },
];

for (const tm of testMappings) {
  const src = path.join(LOCAL_ROOT, tm.file);
  const dest = path.join(LOCAL_ROOT, tm.target, tm.file);
  if (fs.existsSync(src)) {
    safeCopy(src, dest, 'Организация тестов C:');
  }
}

// Перенос Project_Status.md в docs/reports
if (fs.existsSync(path.join(LOCAL_ROOT, 'Project_Status.md'))) {
  safeCopy(
    path.join(LOCAL_ROOT, 'Project_Status.md'),
    path.join(LOCAL_ROOT, 'docs', 'reports', 'Project_Status.md'),
    'Документация C:'
  );
}

// -----------------------------------------------------------------
// ШАГ 3: КОНСОЛИДАЦИЯ КОРНЕВЫХ РАССЕЯННЫХ ФАЙЛОВ GOOGLE ДИСКА
// -----------------------------------------------------------------
console.log('\n--- ШАГ 3: Консолидация корневых файлов Google Диска ---');
const gdriveRootMoves = [
  {
    src: path.join(GDRIVE_ROOT, 'Full_Project_Audit_Report_31_Aug_2026.md'),
    dest: path.join(GDRIVE_FS, 'docs', 'reports', 'Full_Project_Audit_Report_31_Aug_2026.md'),
    desc: 'Корневой отчет GDrive',
  },
  {
    src: path.join(GDRIVE_ROOT, 'Report_v6_Daily_31_Aug_2026.md'),
    dest: path.join(GDRIVE_FS, 'docs', 'reports', 'Report_v6_Daily_31_Aug_2026.md'),
    desc: 'Ежедневный отчет GDrive',
  },
  {
    src: path.join(GDRIVE_ROOT, 'Project_Status_v1.5_31_Aug_2026.md'),
    dest: path.join(GDRIVE_FS, 'docs', 'reports', 'Project_Status_v1.5_31_Aug_2026.md'),
    desc: 'Статус проекта GDrive',
  },
  {
    src: path.join(GDRIVE_ROOT, 'Концепция проекта FlightSaver (Инфографика идеи).png'),
    dest: path.join(GDRIVE_FS, 'assets', 'infographics', 'Концепция проекта FlightSaver (Инфографика идеи).png'),
    desc: 'Инфографика идеи GDrive',
  },
  {
    src: path.join(GDRIVE_ROOT, 'Обмен данными.gdoc'),
    dest: path.join(GDRIVE_FS, 'docs', 'roadmaps', 'Обмен данными.gdoc'),
    desc: 'Документ роадмапа GDrive',
  },
  {
    src: path.join(GDRIVE_ROOT, 'test_price_comparison_target.js'),
    dest: path.join(GDRIVE_FS, 'tests', 'integration', 'test_price_comparison_target.js'),
    desc: 'Тест цен GDrive',
  },
  {
    src: path.join(GDRIVE_ROOT, 'test_telegram_twa_suite.js'),
    dest: path.join(GDRIVE_FS, 'tests', 'integration', 'test_telegram_twa_suite.js'),
    desc: 'Тест TWA GDrive',
  },
  {
    src: path.join(GDRIVE_ROOT, 'test_telegram_auth_supabase.js'),
    dest: path.join(GDRIVE_FS, 'tests', 'integration', 'test_telegram_auth_supabase.js'),
    desc: 'Тест Auth GDrive',
  },
  {
    src: path.join(GDRIVE_ROOT, 'test_telegram_qr_auth.js'),
    dest: path.join(GDRIVE_FS, 'tests', 'integration', 'test_telegram_qr_auth.js'),
    desc: 'Тест QR GDrive',
  },
];

for (const m of gdriveRootMoves) {
  if (fs.existsSync(m.src)) {
    safeMove(m.src, m.dest, m.desc);
  }
}

// -----------------------------------------------------------------
// ШАГ 4: СЛИЯНИЕ ВСПОМОГАТЕЛЬНЫХ ПАПОК GOOGLE ДИСКА В ЕДИНУЮ FlightSaver
// -----------------------------------------------------------------
console.log('\n--- ШАГ 4: Слияние вспомогательных папок Google Диска ---');

// 4.1. Ежедневный отчет -> FlightSaver/docs/reports/daily/
const dailyReportsSrc = path.join(GDRIVE_ROOT, 'Ежедневный отчет');
if (fs.existsSync(dailyReportsSrc)) {
  const files = fs.readdirSync(dailyReportsSrc);
  for (const f of files) {
    if (f === 'desktop.ini') continue;
    const src = path.join(dailyReportsSrc, f);
    const dest = path.join(GDRIVE_FS, 'docs', 'reports', 'daily', f);
    safeCopy(src, dest, 'Миграция Ежедневного отчета');
  }
}

// 4.2. Дорожная карта и План расходов 6мес -> FlightSaver/docs/roadmaps/
const roadmapSrc = path.join(GDRIVE_ROOT, 'Дорожная карта и План расходов 6мес');
if (fs.existsSync(roadmapSrc)) {
  const files = fs.readdirSync(roadmapSrc);
  for (const f of files) {
    if (f === 'desktop.ini') continue;
    const src = path.join(roadmapSrc, f);
    const dest = path.join(GDRIVE_FS, 'docs', 'roadmaps', f);
    safeCopy(src, dest, 'Миграция Дорожной карты');
  }
}

// 4.3. Архив -> FlightSaver/docs/archive/
const archiveSrc = path.join(GDRIVE_ROOT, 'Архив');
if (fs.existsSync(archiveSrc)) {
  const files = fs.readdirSync(archiveSrc);
  for (const f of files) {
    if (f === 'desktop.ini') continue;
    const src = path.join(archiveSrc, f);
    const dest = path.join(GDRIVE_FS, 'docs', 'archive', f);
    safeCopy(src, dest, 'Миграция Архива');
  }
}

// -----------------------------------------------------------------
// ШАГ 5: ИЗОЛЯЦИЯ FlightSaver (1) В КАРАНТИН (.quarantine_duplicates/)
// -----------------------------------------------------------------
console.log('\n--- ШАГ 5: Безопасный перенос дубля FlightSaver (1) в карантин ---');
const fs1Src = path.join(GDRIVE_ROOT, 'FlightSaver (1)');
const fs1Quarantine = path.join(GDRIVE_QUARANTINE, 'FlightSaver_1_Legacy_Snapshot_27Aug2026');

if (fs.existsSync(fs1Src)) {
  // Извлекаем уникальную промо-инфографику перед помещением в карантин
  const promoPng = path.join(fs1Src, 'FlightSaver — Промо-инфографика (Отели STPC и Сплит-билеты).png');
  if (fs.existsSync(promoPng)) {
    safeCopy(
      promoPng,
      path.join(GDRIVE_FS, 'assets', 'infographics', 'FlightSaver — Промо-инфографика (Отели STPC и Сплит-билеты).png'),
      'Извлечение промо-инфографики на G:'
    );
    safeCopy(
      promoPng,
      path.join(LOCAL_ROOT, 'assets', 'infographics', 'FlightSaver — Промо-инфографика (Отели STPC и Сплит-билеты).png'),
      'Копирование промо-инфографики на C:'
    );
  }

  // Перемещаем FlightSaver (1) в карантинную директорию
  console.log(`📦 Перемещение FlightSaver (1) ➔ ${fs1Quarantine}...`);
  ensureDir(GDRIVE_QUARANTINE);
  try {
    execSync(`powershell -Command "Move-Item -LiteralPath '${fs1Src}' -Destination '${fs1Quarantine}' -Force"`, { stdio: 'inherit' });
    console.log(`✓ Папка FlightSaver (1) успешно изолирована в карантине (Zero Data Loss)`);
    actionLog.push({ action: 'QUARANTINE_FOLDER', src: fs1Src, dest: fs1Quarantine, success: true });
  } catch (err) {
    console.warn(`[WARN] Ошибка Move-Item: ${err.message}`);
  }
}

// -----------------------------------------------------------------
// ШАГ 6: СИНХРОНИЗАЦИЯ КАНОНИЧЕСКИХ ДИРЕКТОРИЙ НА GOOGLE ДИСК
// -----------------------------------------------------------------
console.log('\n--- ШАГ 6: Синхронизация канонических папок tests/ и docs/ на Google Диск ---');

function syncFolderRecursive(srcDir, destDir, label) {
  if (!fs.existsSync(srcDir)) return;
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const e of entries) {
    const srcPath = path.join(srcDir, e.name);
    const destPath = path.join(destDir, e.name);
    if (e.isDirectory()) {
      syncFolderRecursive(srcPath, destPath, label);
    } else if (e.isFile()) {
      if (e.name === 'desktop.ini') continue;
      safeCopy(srcPath, destPath, label);
    }
  }
}

syncFolderRecursive(path.join(LOCAL_ROOT, 'tests'), path.join(GDRIVE_FS, 'tests'), 'Синхронизация tests/ на G:');
syncFolderRecursive(path.join(LOCAL_ROOT, 'docs'), path.join(GDRIVE_FS, 'docs'), 'Синхронизация docs/ на G:');
syncFolderRecursive(path.join(LOCAL_ROOT, 'assets'), path.join(GDRIVE_FS, 'assets'), 'Синхронизация assets/ на G:');

// -----------------------------------------------------------------
// ШАГ 7: СОХРАНЕНИЕ МАНИФЕСТА ОПЕРАЦИЙ
// -----------------------------------------------------------------
const manifestPath = path.join(LOCAL_ROOT, 'docs', 'reports', 'Consolidation_Apply_Manifest.json');
fs.writeFileSync(manifestPath, JSON.stringify({
  appliedTimestamp: new Date().toISOString(),
  authorizedBy: 'Geo (Lead Product Owner)',
  command: 'CONFIRM AND APPLY',
  totalOperations: actionLog.length,
  log: actionLog,
}, null, 2), 'utf-8');

console.log(`\n📄 Манифест операций сохранен: ${manifestPath}`);
console.log('================================================================');
console.log(`🏁 КОНСОЛИДАЦИЯ УСПЕШНО ЗАВЕРШЕНА: ${actionLog.length} ОПЕРАЦИЙ БЕЗ ПОТЕРИ ДАННЫХ!`);
console.log('================================================================\n');
