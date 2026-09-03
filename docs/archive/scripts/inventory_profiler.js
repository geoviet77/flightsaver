/**
 * FLIGHTSAVER DATAOPS: STAGE 1 INVENTORY & SHA-256 PROFILER (DRY-RUN)
 * 
 * Сканирует:
 * 1. C:\FlightSaver (за исключением node_modules, .next, .git)
 * 2. Весь Google Диск: G:\Мой диск (все папки и подпапки: FlightSaver, FlightSaver (1),
 *    Ежедневный отчет, Дорожная карта, Архив, корневые файлы).
 * 
 * Не производит никаких изменений (Zero Data Loss / Dry-Run).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('================================================================');
console.log('🔍 FLIGHTSAVER STAGE 1: INVENTORY & SHA-256 CHECKSUM PROFILER');
console.log('================================================================\n');

const LOCAL_WORKSPACE = 'C:\\FlightSaver';
const GDRIVE_ROOT = 'G:\\Мой диск';

function getSha256(filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  } catch (err) {
    return 'READ_ERROR: ' + err.message;
  }
}

function classifyFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (['.ts', '.tsx', '.js', '.jsx', '.py', '.sql', '.html', '.css'].includes(ext)) {
    if (filename.startsWith('test_') || filename.includes('.test.') || filename.includes('.spec.')) {
      return 'Test Suite';
    }
    return 'Source Code';
  }
  if (['.md', '.pdf', '.txt', '.doc', '.docx', '.gdoc', '.pptx'].includes(ext)) {
    return 'Documentation/Reports';
  }
  if (['.png', '.svg', '.jpg', '.jpeg', '.webp', '.ico', '.img'].includes(ext)) {
    return 'Assets/Images';
  }
  if (['.json', '.yaml', '.yml', '.toml'].includes(ext) || filename.startsWith('.env')) {
    return 'Configs';
  }
  return 'Other';
}

const EXCLUDE_DIRS = new Set([
  'node_modules',
  '.next',
  '.git',
  '.pytest_cache',
  '__pycache__',
  '$recycle.bin',
  '.shortcut-targets-by-id',
  '.encrypted',
]);

function scanDirectory(baseDir, sourceLabel, registry = []) {
  if (!fs.existsSync(baseDir)) {
    console.warn(`[WARN] Directory not found: ${baseDir}`);
    return registry;
  }

  function walk(currentDir) {
    let entries = [];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch (e) {
      console.warn(`[WARN] Cannot read dir: ${currentDir} (${e.message})`);
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const lowerName = entry.name.toLowerCase();

      if (entry.isDirectory()) {
        if (EXCLUDE_DIRS.has(lowerName)) {
          continue;
        }
        walk(fullPath);
      } else if (entry.isFile()) {
        if (entry.name === 'desktop.ini') continue; // служебный файл Windows

        try {
          const stats = fs.statSync(fullPath);
          const relPath = path.relative(baseDir, fullPath);
          const hash = getSha256(fullPath);
          const classification = classifyFile(entry.name);

          registry.push({
            sourceLocation: sourceLabel,
            fullPath,
            relativeDir: path.dirname(relPath),
            filename: entry.name,
            sizeBytes: stats.size,
            createdAt: stats.birthtime.toISOString(),
            modifiedAt: stats.mtime.toISOString(),
            sha256: hash,
            classification,
          });
        } catch (err) {
          console.warn(`[WARN] Error scanning file: ${fullPath} (${err.message})`);
        }
      }
    }
  }

  walk(baseDir);
  return registry;
}

console.log('⏳ Сканирование 1: Локальный диск C:\\FlightSaver...');
const localFiles = scanDirectory(LOCAL_WORKSPACE, 'C_Drive_Local');
console.log(`✓ Завершено C:. Найдено файлов: ${localFiles.length}`);

console.log('\n⏳ Сканирование 2: Весь Google Диск (G:\\Мой диск)...');
const gdriveFiles = scanDirectory(GDRIVE_ROOT, 'Google_Drive');
console.log(`✓ Завершено Google Диск. Найдено файлов: ${gdriveFiles.length}`);

const allFiles = [...localFiles, ...gdriveFiles];
console.log(`\n📦 Всего просканировано файлов в реестре: ${allFiles.length}`);

// -----------------------------------------------------------------
// АНАЛИЗ КАТЕГОРИЙ ДЕДУБЛИКАЦИИ
// -----------------------------------------------------------------
console.log('\n🔬 Анализ SHA-256 и группировка по категориям...');

// 1. Хэш-мапа для поиска идентичных дубликатов (Категория A)
const hashMap = new Map();
for (const f of allFiles) {
  if (!hashMap.has(f.sha256)) {
    hashMap.set(f.sha256, []);
  }
  hashMap.get(f.sha256).push(f);
}

const exactDuplicates = [];
for (const [hash, fileList] of hashMap.entries()) {
  if (fileList.length > 1 && hash !== 'READ_ERROR') {
    exactDuplicates.push({
      sha256: hash,
      count: fileList.length,
      sampleName: fileList[0].filename,
      sizeBytes: fileList[0].sizeBytes,
      instances: fileList,
    });
  }
}

// 2. Поиск коллизий имен с разным содержимым (Категория B)
const nameMap = new Map();
for (const f of allFiles) {
  if (!nameMap.has(f.filename)) {
    nameMap.set(f.filename, []);
  }
  nameMap.get(f.filename).push(f);
}

const nameCollisions = [];
for (const [filename, list] of nameMap.entries()) {
  const uniqueHashes = new Set(list.map((item) => item.sha256));
  if (uniqueHashes.size > 1) {
    nameCollisions.push({
      filename,
      divergentVersionsCount: uniqueHashes.size,
      totalFiles: list.length,
      versions: list,
    });
  }
}

// 3. Рассеянные файлы в корне Google Диска и C: (Категория C)
const displacedFiles = allFiles.filter((f) => {
  const isGdriveRoot = f.sourceLocation === 'Google_Drive' && f.relativeDir === '.';
  const isLocalRoot = f.sourceLocation === 'C_Drive_Local' && f.relativeDir === '.' && (
    f.filename.startsWith('test_') ||
    f.filename.startsWith('Report_') ||
    f.filename.endsWith('.png') ||
    f.filename.endsWith('.pdf') ||
    f.filename.endsWith('.md')
  );
  return isGdriveRoot || isLocalRoot;
});

// Формирование JSON-реестра
const registryReport = {
  scanTimestamp: new Date().toISOString(),
  totalScannedFiles: allFiles.length,
  localCount: localFiles.length,
  gdriveCount: gdriveFiles.length,
  summary: {
    categoryA_ExactDuplicateGroups: exactDuplicates.length,
    categoryB_NameCollisionGroups: nameCollisions.length,
    categoryC_DisplacedFiles: displacedFiles.length,
  },
  exactDuplicates,
  nameCollisions,
  displacedFiles,
  rawInventory: allFiles,
};

const jsonOutputPath = path.join(LOCAL_WORKSPACE, 'Reports', 'DryRun_Inventory_Registry.json');
fs.writeFileSync(jsonOutputPath, JSON.stringify(registryReport, null, 2), 'utf-8');
console.log(`\n💾 Полный JSON-реестр сохранен: ${jsonOutputPath}`);

// Вывод итогов в консоль
console.log('\n================================================================');
console.log('📊 ИТОГИ СКАНИРОВАНИЯ ЭТАПА 1 (DRY-RUN):');
console.log(`• Всего файлов просканировано: ${allFiles.length}`);
console.log(`  - Локально на C:\\FlightSaver: ${localFiles.length}`);
console.log(`  - На Google Диске (весь G:\\Мой диск): ${gdriveFiles.length}`);
console.log(`• Категория A (Точные дубликаты SHA-256): ${exactDuplicates.length} групп файлов`);
console.log(`• Категория B (Коллизии имен / разные версии): ${nameCollisions.length} групп файлов`);
console.log(`• Категория C (Смещенные файлы в корне): ${displacedFiles.length} файлов`);
console.log('================================================================\n');
