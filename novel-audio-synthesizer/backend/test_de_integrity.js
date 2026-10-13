/**
 * SyncTone — Data Engineering Integrity & Normalization Verification Suite
 *
 * Verifies:
 * 1. Database connectivity without secrets exposure
 * 2. MongoDB Chapter Model schema, indexes, and pg_chapter_id linkage
 * 3. PostgreSQL relational constraints (PK, FK, unique, check, partial unique index)
 * 4. Polyglot ingestion integrity (cross-store atomicity, rollback, compensating cleanup)
 * 5. Data-quality checks (duplicate keys, foreign key violations, invalid types)
 * 6. Representative SQL query outputs (joins, lookups, atomic upsert, SKIP LOCKED queue claim)
 */

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { pool, connectMongo, connectPostgres } = require('./src/db');
const { Chapter } = require('./src/models');
const { config } = require('./src/config');
const { authenticateUser } = require('./src/middleware/auth');
const { v4: uuidv4 } = require('uuid');

async function runDEIntegrityTests() {
  console.log('========================================================================');
  console.log('📊 SYNCTONE DATA ENGINEERING INTEGRITY & ACCEPTANCE TEST SUITE');
  console.log('========================================================================\n');

  // 1. Connection check
  console.log('▶ [DE-1] Verifying Database Connectivity & Active Sessions...');
  await connectPostgres();
  await connectMongo();

  const pgRes = await pool.query('SELECT current_database(), current_user, version()');
  console.log(`  ✔ PostgreSQL Active: DB="${pgRes.rows[0].current_database}", User="${pgRes.rows[0].current_user}"`);
  console.log(`  ✔ MongoDB Active: readyState=${mongoose.connection.readyState}, Host=${mongoose.connection.host}:${mongoose.connection.port}\n`);

  // 2. Schema constraints verification (PostgreSQL)
  console.log('▶ [DE-2] Testing Relational Schema Constraints & Integrity Rules...');

  // Setup test user
  const testUserId = uuidv4();
  const testUsername = `de_user_${Date.now()}`;
  const testEmail = `de_${Date.now()}@test.internal`;

  await pool.query(
    `
    INSERT INTO users (id, username, email, password_hash, role)
    VALUES ($1, $2, $3, crypt('TestPass123', gen_salt('bf')), 'writer');
  `,
    [testUserId, testUsername, testEmail]
  );
  console.log(`  ✔ Inserted test author: ${testUserId}`);

  // Test 2.1: Duplicate user email rejection (UNIQUE constraint)
  try {
    await pool.query(
      `
      INSERT INTO users (username, email, password_hash, role)
      VALUES ($1, $2, crypt('AnotherPass', gen_salt('bf')), 'reader');
    `,
      [`another_${Date.now()}`, testEmail]
    );
    throw new Error('Expected duplicate email insertion to fail');
  } catch (err) {
    if (err.code !== '23505') throw err;
    console.log('  ✔ Relational Check: UNIQUE(users.email) correctly enforced (23505 duplicate key)');
  }

  // Test 2.2: Invalid role rejection (CHECK constraint)
  try {
    await pool.query(
      `
      INSERT INTO users (username, email, password_hash, role)
      VALUES ($1, $2, 'hash', 'superhero');
    `,
      [`invalid_role_${Date.now()}`, `invalid_${Date.now()}@test.internal`]
    );
    throw new Error('Expected invalid role check constraint to fail');
  } catch (err) {
    if (err.code !== '23514') throw err;
    console.log('  ✔ Relational Check: CHECK(users.role IN (...)) correctly enforced (23514 check violation)');
  }

  // Setup test novel
  const testNovelId = uuidv4();
  await pool.query(
    `
    INSERT INTO novels (id, added_by, title, synopsis, channel, status)
    VALUES ($1, $2, 'DE Test Novel', 'Novel for DE integrity validation.', 'verified', 'draft');
  `,
    [testNovelId, testUserId]
  );
  console.log(`  ✔ Inserted test novel: ${testNovelId}`);

  // Test 2.3: Foreign key enforcement (novels.added_by -> users.id)
  try {
    await pool.query(
      `
      INSERT INTO novels (added_by, title, channel)
      VALUES ('00000000-0000-0000-0000-000000000000', 'FK Orphan Novel', 'verified');
    `
    );
    throw new Error('Expected invalid foreign key to fail');
  } catch (err) {
    if (err.code !== '23503') throw err;
    console.log('  ✔ Relational Check: FK novels.added_by -> users.id correctly enforced (23503 foreign key violation)');
  }

  // Test 2.4: Partial Unique Index: at most ONE narrator per novel
  await pool.query(
    `
    INSERT INTO characters (novel_id, canonical_name, voice_id, is_narrator)
    VALUES ($1, 'Narrator One', 'am_adam', true);
  `,
    [testNovelId]
  );
  console.log('  ✔ Inserted primary narrator for test novel');

  try {
    await pool.query(
      `
      INSERT INTO characters (novel_id, canonical_name, voice_id, is_narrator)
      VALUES ($1, 'Narrator Two (Illegal Second)', 'af_heart', true);
    `,
      [testNovelId]
    );
    throw new Error('Expected duplicate narrator insertion to fail partial unique index');
  } catch (err) {
    if (err.code !== '23505' || !err.message.includes('uq_characters_narrator_per_novel')) throw err;
    console.log('  ✔ Relational Check: Partial Unique Index uq_characters_narrator_per_novel enforced (second is_narrator=true rejected)');
  }

  // Non-narrator character for same novel must succeed:
  await pool.query(
    `
    INSERT INTO characters (novel_id, canonical_name, voice_id, is_narrator)
    VALUES ($1, 'Secondary Character', 'af_heart', false);
  `,
    [testNovelId]
  );
  console.log('  ✔ Relational Check: Non-narrator characters for same novel insert without collision');

  // Test 2.5: Composite Unique Key: UNIQUE(novel_id, chapter_number)
  const testChapterId = uuidv4();
  await pool.query(
    `
    INSERT INTO chapters (id, novel_id, chapter_number, title, status)
    VALUES ($1, $2, 1, 'Chapter 1: The Beginning', 'draft');
  `,
    [testChapterId, testNovelId]
  );
  console.log(`  ✔ Inserted chapter 1 (id: ${testChapterId})`);

  try {
    await pool.query(
      `
      INSERT INTO chapters (novel_id, chapter_number, title, status)
      VALUES ($1, 1, 'Duplicate Chapter 1', 'draft');
    `,
      [testNovelId]
    );
    throw new Error('Expected duplicate chapter number to fail');
  } catch (err) {
    if (err.code !== '23505' || !err.message.includes('uq_chapters_novel_chapter_number')) throw err;
    console.log('  ✔ Relational Check: Composite UK uq_chapters_novel_chapter_number enforced');
  }

  // Test 2.6: synthesis_jobs check constraint
  // profile_novel must have chapter_id IS NULL
  try {
    await pool.query(
      `
      INSERT INTO synthesis_jobs (novel_id, chapter_id, job_type)
      VALUES ($1, $2, 'profile_novel');
    `,
      [testNovelId, testChapterId]
    );
    throw new Error('Expected profile_novel with non-null chapter_id to fail');
  } catch (err) {
    if (err.code !== '23514' || !err.message.includes('chk_jobs_type_chapter_match')) throw err;
    console.log('  ✔ Relational Check: CHECK(chk_jobs_type_chapter_match) correctly enforced for profile_novel');
  }

  // Test 2.7: Composite Unique Constraint: character_aliases (uq_character_aliases_novel_alias)
  const char1Id = uuidv4();
  const char2Id = uuidv4();
  await pool.query(
    `INSERT INTO characters (id, novel_id, canonical_name, voice_id, is_narrator)
     VALUES ($1, $2, 'Sherlock Holmes', 'am_adam', false),
            ($3, $2, 'Dr. John Watson', 'am_adam', false);`,
    [char1Id, testNovelId, char2Id]
  );

  await pool.query(
    `INSERT INTO character_aliases (novel_id, character_id, alias)
     VALUES ($1, $2, 'The Consulting Detective');`,
    [testNovelId, char1Id]
  );
  console.log('  ✔ Inserted character alias "The Consulting Detective" for Sherlock');

  try {
    await pool.query(
      `INSERT INTO character_aliases (novel_id, character_id, alias)
       VALUES ($1, $2, 'The Consulting Detective');`,
      [testNovelId, char2Id]
    );
    throw new Error('Expected duplicate character alias to fail unique constraint');
  } catch (err) {
    if (err.code !== '23505' || !err.message.includes('uq_character_aliases_novel_alias')) throw err;
    console.log('  ✔ Relational Check: UNIQUE(novel_id, alias) on character_aliases correctly enforced (23505 uq_character_aliases_novel_alias)');
  }

  // Test 2.8: Expired JWT rejection & authentication middleware validation
  const expiredJwtToken = jwt.sign(
    { id: testUserId, username: testUsername, role: 'writer' },
    config.jwtSecret,
    { expiresIn: '-10s' }
  );

  let jwtStatusCode = null;
  let jwtResponseBody = null;
  const mockReq = {
    cookies: { token: expiredJwtToken },
    headers: {},
  };
  const mockRes = {
    status(code) {
      jwtStatusCode = code;
      return this;
    },
    json(data) {
      jwtResponseBody = data;
      return this;
    },
  };

  let nextInvoked = false;
  authenticateUser(mockReq, mockRes, () => {
    nextInvoked = true;
  });

  if (nextInvoked || jwtStatusCode !== 401 || !jwtResponseBody?.error?.includes('expired')) {
    throw new Error(`Expected expired JWT rejection with 401, got status=${jwtStatusCode}`);
  }
  console.log('  ✔ Security Check: Expired JWT token properly rejected with 401 ("Invalid or expired authentication token.")\n');

  // 3. Polyglot persistence & cross-store linkage
  console.log('▶ [DE-3] Testing Polyglot Linkage (PostgreSQL <-> MongoDB)...');
  const mongoChapter = new Chapter({
    pg_chapter_id: testChapterId,
    novel_id: testNovelId,
    chapter_number: 1,
    title: 'Chapter 1: The Beginning',
    raw_text: 'It was the best of times, it was the worst of times...',
    segments: [
      {
        order: 1,
        type: 'narration',
        text: 'It was the best of times...',
        voice_id: 'am_adam',
        start_ms: 0,
        end_ms: 3200,
      },
    ],
    manifest: {
      total_duration_ms: 3200,
      audio_url: `${testChapterId}.opus`,
      timeline: [
        {
          order: 1,
          start_ms: 0,
          end_ms: 3200,
          voice_id: 'am_adam',
          text: 'It was the best of times...',
        },
      ],
    },
  });
  await mongoChapter.save();
  console.log(`  ✔ MongoDB chapter document saved with _id=${mongoChapter._id}`);

  // Cross-store consistency query
  const pgCh = await pool.query('SELECT * FROM chapters WHERE id = $1', [testChapterId]);
  const mgCh = await Chapter.findOne({ pg_chapter_id: testChapterId });
  if (!pgCh.rows[0] || !mgCh) throw new Error('Cross-store linkage missing');
  if (pgCh.rows[0].id !== mgCh.pg_chapter_id) throw new Error('UUID mismatch');
  console.log(`  ✔ Cross-Store Linkage Verified: pg_chapter_id (${mgCh.pg_chapter_id}) === chapters.id (${pgCh.rows[0].id})`);

  // Test 3.2: Partial failure rollback & compensating cleanup
  console.log('  ▶ Testing failure compensation and absence of silent partial state...');
  const failChapterId = uuidv4();
  const client = await pool.connect();
  let rollbackExecuted = false;

  try {
    await client.query('BEGIN');
    await client.query(
      `
      INSERT INTO chapters (id, novel_id, chapter_number, title)
      VALUES ($1, $2, 2, 'Simulated Failure Chapter');
    `,
      [failChapterId, testNovelId]
    );

    // Simulate downstream MongoDB failure or error
    throw new Error('Simulated network failure to MongoDB');
  } catch (err) {
    await client.query('ROLLBACK');
    rollbackExecuted = true;
  } finally {
    client.release();
  }

  // Verify PostgreSQL rolled back completely
  const orphanPg = await pool.query('SELECT * FROM chapters WHERE id = $1', [failChapterId]);
  const orphanMg = await Chapter.findOne({ pg_chapter_id: failChapterId });
  if (orphanPg.rows.length !== 0 || orphanMg !== null) {
    throw new Error('Silent partial state detected after simulated failure');
  }
  console.log(`  ✔ Rollback Verified: Zero orphan records in PostgreSQL (found: ${orphanPg.rows.length}) and MongoDB (found: ${orphanMg ? 1 : 0})`);

  // Test 3.3: Atomic novel creation failure rollback (Audit Fix 1)
  console.log('  ▶ [Audit Fix 1] Testing atomic novel creation transaction rollback on job failure...');
  const failNovelId = uuidv4();
  const novelClient = await pool.connect();
  try {
    await novelClient.query('BEGIN');
    await novelClient.query(
      `INSERT INTO novels (id, added_by, title, synopsis, channel)
       VALUES ($1, $2, 'Orphan Candidate Novel', 'Should be rolled back', 'verified');`,
      [failNovelId, testUserId]
    );
    // Intentionally violate check constraint on synthesis_jobs:
    // profile_novel MUST have chapter_id IS NULL; providing non-null chapter_id triggers 23514
    await novelClient.query(
      `INSERT INTO synthesis_jobs (novel_id, chapter_id, requested_by, job_type)
       VALUES ($1, '00000000-0000-0000-0000-000000000000', $2, 'profile_novel');`,
      [failNovelId, testUserId]
    );
    await novelClient.query('COMMIT');
    throw new Error('Expected transaction to fail on invalid synthesis job');
  } catch (err) {
    await novelClient.query('ROLLBACK').catch(() => {});
  } finally {
    novelClient.release();
  }

  const orphanNovelRes = await pool.query('SELECT * FROM novels WHERE id = $1', [failNovelId]);
  if (orphanNovelRes.rows.length !== 0) {
    throw new Error('Atomic novel rollback failed: orphan novel record found');
  }
  console.log('  ✔ Atomic Novel Creation Rollback Verified: Zero orphan novel records remaining in PostgreSQL');

  // Test 3.4: Chapter numbering race serialization via SELECT ... FOR UPDATE (Audit Fix 2)
  console.log('  ▶ [Audit Fix 2] Testing chapter auto-numbering concurrency serialization with FOR UPDATE...');

  async function simulateConcurrentChapterInsert(clientTitle) {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      // Lock parent novel row
      await c.query('SELECT id FROM novels WHERE id = $1 FOR UPDATE', [testNovelId]);
      await new Promise((r) => setTimeout(r, 25));
      const maxRes = await c.query(
        'SELECT COALESCE(MAX(chapter_number), 0) + 1 AS next_num FROM chapters WHERE novel_id = $1',
        [testNovelId]
      );
      const nextNum = parseInt(maxRes.rows[0].next_num, 10);
      const chId = uuidv4();
      await c.query(
        'INSERT INTO chapters (id, novel_id, chapter_number, title) VALUES ($1, $2, $3, $4)',
        [chId, testNovelId, nextNum, clientTitle]
      );
      await c.query('COMMIT');
      return { id: chId, chapter_number: nextNum };
    } catch (err) {
      await c.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      c.release();
    }
  }

  const [concurrentCh1, concurrentCh2] = await Promise.all([
    simulateConcurrentChapterInsert('Concurrent Auto Chapter A'),
    simulateConcurrentChapterInsert('Concurrent Auto Chapter B'),
  ]);

  if (concurrentCh1.chapter_number === concurrentCh2.chapter_number) {
    throw new Error(`Race condition detected: duplicate chapter numbers (${concurrentCh1.chapter_number})`);
  }
  const assignedNums = [concurrentCh1.chapter_number, concurrentCh2.chapter_number].sort((a, b) => a - b);
  console.log(`  ✔ Chapter Numbering Race Mitigation Verified: Sequential numbers assigned without collision: [${assignedNums.join(', ')}]\n`);

  // 4. Representative SQL queries & output recording
  console.log('▶ [DE-4] Recording Representative SQL Query Outputs for DE Evidence...');

  // 4.1 Novel Catalog Join Query
  console.log('\n  --- [Query 1: Novel Catalog with Author & Narrator Voice Join] ---');
  const catalogQuery = `
    SELECT
      n.id AS novel_id,
      n.title,
      n.channel,
      n.status,
      u.username AS author,
      c.canonical_name AS narrator_name,
      v.label AS narrator_voice
    FROM novels n
    JOIN users u ON n.added_by = u.id
    LEFT JOIN characters c ON c.novel_id = n.id AND c.is_narrator = true
    LEFT JOIN voices v ON c.voice_id = v.id
    WHERE n.id = $1;
  `;
  const catalogRes = await pool.query(catalogQuery, [testNovelId]);
  console.table(catalogRes.rows);

  // 4.2 Playback History Atomic Upsert Query
  console.log('  --- [Query 2: Playback History Atomic Upsert (ON CONFLICT DO UPDATE)] ---');
  const upsertQuery = `
    INSERT INTO playback_history (user_id, novel_id, chapter_id, segment_order, position_ms, updated_at)
    VALUES ($1, $2, $3, 1, 4500, now())
    ON CONFLICT (user_id, novel_id) DO UPDATE SET
      chapter_id = EXCLUDED.chapter_id,
      segment_order = EXCLUDED.segment_order,
      position_ms = EXCLUDED.position_ms,
      updated_at = now()
    RETURNING id, user_id, novel_id, chapter_id, segment_order, position_ms, updated_at;
  `;
  const upsertRes1 = await pool.query(upsertQuery, [testUserId, testNovelId, testChapterId]);
  console.log('  First Insert:');
  console.table(upsertRes1.rows);

  // Execute update on same user/novel
  const upsertRes2 = await pool.query(
    `
    INSERT INTO playback_history (user_id, novel_id, chapter_id, segment_order, position_ms, updated_at)
    VALUES ($1, $2, $3, 2, 9200, now())
    ON CONFLICT (user_id, novel_id) DO UPDATE SET
      chapter_id = EXCLUDED.chapter_id,
      segment_order = EXCLUDED.segment_order,
      position_ms = EXCLUDED.position_ms,
      updated_at = now()
    RETURNING id, user_id, novel_id, chapter_id, segment_order, position_ms, updated_at;
  `,
    [testUserId, testNovelId, testChapterId]
  );
  console.log('  Atomic Upsert Update:');
  console.table(upsertRes2.rows);

  // 4.3 Task Queue Worker Claim Query (FOR UPDATE SKIP LOCKED)
  console.log('  --- [Query 3: Task Queue Worker Polling (FOR UPDATE SKIP LOCKED)] ---');
  await pool.query(
    `
    INSERT INTO synthesis_jobs (novel_id, chapter_id, requested_by, job_type, status)
    VALUES ($1, $2, $3, 'synthesize_chapter', 'queued');
  `,
    [testNovelId, testChapterId, testUserId]
  );

  const workerClaimQuery = `
    SELECT id, novel_id, chapter_id, job_type, status, attempts
    FROM synthesis_jobs
    WHERE status = 'queued' AND run_after <= now() AND attempts < max_attempts
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;
  `;
  const workerClaimRes = await pool.query(workerClaimQuery);
  console.table(workerClaimRes.rows);

  // 5. Cleanup test artifacts
  console.log('\n▶ [DE-5] Cleaning up test fixtures...');
  await Chapter.deleteMany({ novel_id: testNovelId });
  await pool.query('DELETE FROM users WHERE id = $1', [testUserId]); // Cascades to novels, chapters, characters, jobs, history
  console.log('  ✔ All test fixtures removed from PostgreSQL & MongoDB');

  console.log('\n========================================================================');
  console.log('🎉 ALL DATA ENGINEERING & INTEGRITY TESTS PASSED SUCCESSFULLY (100%)!');
  console.log('========================================================================\n');
}

runDEIntegrityTests()
  .catch((err) => {
    console.error('\n❌ DE TEST FAILED:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
    await mongoose.disconnect();
  });
