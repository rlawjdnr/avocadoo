import { createClient } from '@supabase/supabase-js';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

function parseEnvFile(text) {
  return Object.fromEntries(
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const separator = line.indexOf('=');
        return separator === -1 ? [line, ''] : [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );
}

function getOptimizedPath(storagePath) {
  const directory = dirname(storagePath);
  const extension = extname(storagePath);
  const name = basename(storagePath, extension);
  return join(directory, `optimized-${name}.jpg`).replaceAll('\\', '/');
}

async function compressImage(inputPath, outputPath) {
  await execFileAsync('sips', ['-Z', '960', '-s', 'format', 'jpeg', '-s', 'formatOptions', '68', inputPath, '--out', outputPath]);
}

async function main() {
  const env = parseEnvFile(await readFile(new URL('../.env.local', import.meta.url), 'utf8'));
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;
  const bucket = env.VITE_SUPABASE_STORAGE_BUCKET || 'diary-images';

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('.env.local에 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY가 필요합니다.');
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: images, error } = await supabase
    .from('diary_images')
    .select('id, image_url, storage_path, sort_order')
    .order('sort_order', { ascending: true });

  if (error) throw error;

  const rows = (images || []).filter((image) => image.storage_path && !basename(image.storage_path).startsWith('optimized-'));
  console.log(`Found ${images?.length || 0} image rows, ${rows.length} need compression.`);

  const workingDir = await mkdtemp(join(tmpdir(), 'avocado-images-'));
  let updated = 0;
  let skipped = 0;

  try {
    for (const row of rows) {
      const originalPath = row.storage_path;
      const optimizedPath = getOptimizedPath(originalPath);
      const originalUrl = supabase.storage.from(bucket).getPublicUrl(originalPath).data.publicUrl;
      const response = await fetch(originalUrl);

      if (!response.ok) {
        console.warn(`SKIP ${row.id}: download failed ${response.status} ${originalPath}`);
        skipped += 1;
        continue;
      }

      const inputPath = join(workingDir, `${row.id}-original`);
      const outputPath = join(workingDir, `${row.id}-optimized.jpg`);
      await writeFile(inputPath, Buffer.from(await response.arrayBuffer()));
      await compressImage(inputPath, outputPath);

      const [originalStat, optimizedStat] = await Promise.all([stat(inputPath), stat(outputPath)]);
      if (optimizedStat.size >= originalStat.size) {
        console.log(`SKIP ${row.id}: optimized is not smaller (${originalStat.size} -> ${optimizedStat.size})`);
        skipped += 1;
        continue;
      }

      const optimizedBytes = await readFile(outputPath);
      const upload = await supabase.storage.from(bucket).upload(optimizedPath, optimizedBytes, {
        cacheControl: '31536000',
        contentType: 'image/jpeg',
        upsert: false,
      });

      if (upload.error) {
        console.warn(`SKIP ${row.id}: upload failed ${upload.error.message}`);
        skipped += 1;
        continue;
      }

      const optimizedUrl = supabase.storage.from(bucket).getPublicUrl(optimizedPath).data.publicUrl;
      const update = await supabase
        .from('diary_images')
        .update({
          image_url: optimizedUrl,
          storage_path: optimizedPath,
        })
        .eq('id', row.id);

      if (update.error) {
        console.warn(`SKIP ${row.id}: DB update failed ${update.error.message}`);
        skipped += 1;
        continue;
      }

      updated += 1;
      console.log(`OK ${row.id}: ${originalStat.size} -> ${optimizedStat.size}`);
    }
  } finally {
    await rm(workingDir, { recursive: true, force: true });
  }

  console.log(`Done. Updated ${updated}, skipped ${skipped}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
