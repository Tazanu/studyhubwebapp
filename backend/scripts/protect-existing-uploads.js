/**
 * One-off migration: take every file behind paid content out of the public
 * namespace.
 *
 *   - local files  -> moved into uploads/protected/
 *   - Cloudinary   -> switched to `authenticated` delivery
 *
 * Safe to re-run; already-protected files are skipped.
 * Pass --dry to preview without changing anything.
 */
require('dotenv').config();
const prisma = require('../src/prisma');
const { protectFile, isRemote, isProtectedLocal, isProtectedRemote } = require('../src/services/fileAccess');

const DRY = process.argv.includes('--dry');

const alreadyProtected = p =>
    !p || (isRemote(p) ? isProtectedRemote(p) : isProtectedLocal(p));

async function run(label, rows, update) {
    let moved = 0, skipped = 0, failed = 0;
    for (const row of rows) {
        if (alreadyProtected(row.file_path)) { skipped++; continue; }
        if (DRY) {
            console.log(`  [dry] would protect ${label} #${row.id}: ${row.file_path}`);
            moved++;
            continue;
        }
        try {
            const next = await protectFile(row.file_path);
            if (next && next !== row.file_path) {
                await update(row.id, next);
                console.log(`  ${label} #${row.id}: ${row.file_path}  ->  ${next}`);
                moved++;
            } else {
                skipped++;
            }
        } catch (e) {
            console.error(`  ${label} #${row.id} FAILED: ${e.message}`);
            failed++;
        }
    }
    console.log(`${label}: ${moved} protected, ${skipped} already safe, ${failed} failed\n`);
    return failed;
}

(async () => {
    console.log(DRY ? '=== DRY RUN — no changes ===\n' : '=== Protecting paid content ===\n');
    let failures = 0;

    const premiumNotes = await prisma.premium_notes.findMany({ select: { id: true, file_path: true } });
    failures += await run('premium_notes', premiumNotes, (id, file_path) =>
        prisma.premium_notes.update({ where: { id }, data: { file_path } }));

    const paidNotes = await prisma.notes.findMany({
        where: { is_premium: true },
        select: { id: true, file_path: true },
    });
    failures += await run('notes (is_premium)', paidNotes, (id, file_path) =>
        prisma.notes.update({ where: { id }, data: { file_path } }));

    await prisma.$disconnect();
    process.exit(failures ? 1 : 0);
})();
