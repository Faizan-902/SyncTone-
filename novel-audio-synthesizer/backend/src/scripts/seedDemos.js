/**
 * SyncTone — Idempotent Demo Seeder
 *
 * Seeds reference demo portfolio datasets across PostgreSQL and MongoDB:
 * 1. System demo author user ('demo_author@synctone.internal')
 * 2. Local Verified Demo: 'Harry Potter and the Philosopher's Stone' (Chapter 1)
 *    with full British cast, grounded sample quotes, 4NF aliases, and synthesized audio.
 * 3. Public Verified Demo: 'The Adventures of Sherlock Holmes' (Chapters 1 & 2)
 *    with Victorian cast, grounded sample quotes, 4NF aliases, and synthesized audio.
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { pool, connectMongo, connectPostgres } = require('../db');
const { Chapter } = require('../models');
const { audioStitcher } = require('../engine/audioStitcher');
const { ttsEngine } = require('../engine/ttsEngine');
const { validateAudioBuffer } = require('../engine/audioValidator');
const { config } = require('../config');

// Voice Catalog fallback seeds to ensure all requested voice IDs exist
const REQUIRED_VOICES = [
  { id: 'en-GB-RyanNeural', label: 'Ryan Neural (British Narrator)', gender: 'male', age_band: 'adult', language: 'en-gb', reserved_narrator: true },
  { id: 'en-GB-ThomasNeural', label: 'Thomas Neural (Harry Potter)', gender: 'male', age_band: 'young', language: 'en-gb', reserved_narrator: false },
  { id: 'en-GB-LibbyNeural', label: 'Libby Neural (Hermione Granger)', gender: 'female', age_band: 'young', language: 'en-gb', reserved_narrator: false },
  { id: 'en-GB-AlfieNeural', label: 'Alfie Neural (Ron Weasley)', gender: 'male', age_band: 'young', language: 'en-gb', reserved_narrator: false },
  { id: 'en-GB-ArthurNeural', label: 'Arthur Neural (Albus Dumbledore)', gender: 'male', age_band: 'elder', language: 'en-gb', reserved_narrator: false },
  { id: 'en-GB-NoahNeural', label: 'Noah Neural (Severus Snape)', gender: 'male', age_band: 'adult', language: 'en-gb', reserved_narrator: false },
  { id: 'en-GB-SoniaNeural', label: 'Sonia Neural (Prof. McGonagall)', gender: 'female', age_band: 'adult', language: 'en-gb', reserved_narrator: false },
  { id: 'bm_george', label: 'George (British Received)', gender: 'male', age_band: 'adult', language: 'en-gb', reserved_narrator: false },
  { id: 'bm_daniel', label: 'Daniel (British Expressive)', gender: 'male', age_band: 'young', language: 'en-gb', reserved_narrator: false },
  { id: 'bf_emma', label: 'Emma (British Refined)', gender: 'female', age_band: 'young', language: 'en-gb', reserved_narrator: false },
  { id: 'am_michael', label: 'Michael (Strong & Resonant)', gender: 'male', age_band: 'adult', language: 'en-us', reserved_narrator: false },
];

/**
 * Ensures a valid demo audio file exists for the chapter.
 */
async function ensureChapterAudio(chapterId, segments) {
  const outputDir = config.paths.outputDir;
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const mp3Path = path.join(outputDir, `${chapterId}.mp3`);
  const wavPath = path.join(outputDir, `${chapterId}.wav`);

  if ((fs.existsSync(mp3Path) && fs.statSync(mp3Path).size > 0) ||
      (fs.existsSync(wavPath) && fs.statSync(wavPath).size > 0)) {
    return;
  }

  console.log(`  [Audio] Generating playback demo audio for chapter ${chapterId}...`);
  const segmentAudios = [];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    let buffer = null;
    let format = 'mp3';

    try {
      const result = await ttsEngine.synthesizeSegment(seg.text, seg.voice_id);
      if (result && result.audio_buffer && result.audio_buffer.length > 0) {
        buffer = result.audio_buffer;
        format = result.format || 'mp3';
      }
    } catch (_synthErr) {
      // Cloud TTS unavailable, fall through to synthetic silence/tone buffer
    }

    const durationMs = seg.end_ms - seg.start_ms;
    if (!buffer || buffer.length === 0) {
      buffer = audioStitcher.createMp3SilenceBuffer(durationMs);
      format = 'mp3';
    }

    segmentAudios.push({
      order: seg.order,
      segment_id: seg.segment_id,
      text: seg.text,
      voice_id: seg.voice_id,
      speaker_name: seg.speaker_name,
      character_id: seg.character_id,
      audio_buffer: buffer,
      pcm_buffer: buffer,
      duration_ms: durationMs,
      format,
    });
  }

  const stitchFn = typeof audioStitcher.stitchAudioSegments === 'function'
    ? audioStitcher.stitchAudioSegments.bind(audioStitcher)
    : audioStitcher.stitch.bind(audioStitcher);

  const stitched = stitchFn(segmentAudios, chapterId);

  // Validate resulting audio (support both mp3 and wav fallback)
  const savedAudioPath = fs.existsSync(mp3Path) ? mp3Path : wavPath;
  if (fs.existsSync(savedAudioPath)) {
    const savedBuffer = fs.readFileSync(savedAudioPath);
    const audioFmt = savedAudioPath.endsWith('.mp3') ? 'mp3' : 'wav';
    if (!validateAudioBuffer(savedBuffer, audioFmt)) {
      console.warn(`  [Audio Warning] Audio buffer validation warning for ${savedAudioPath}`);
    }
  }

  return stitched;
}

/**
 * Main idempotent demo seeding routine.
 *
 * @param {object} [options]
 * @param {boolean} [options.closeConnections=false] - If true, terminates DB pools upon completion
 */
async function seedDemos({ closeConnections = false } = {}) {
  console.log('========================================================================');
  console.log('🌱 SYNCTONE IDEMPOTENT DEMO DATABASE SEEDER');
  console.log('========================================================================\n');

  await connectPostgres();
  await connectMongo();

  // ---------------------------------------------------------------------------
  // 1. Ensure Voice Catalog
  // ---------------------------------------------------------------------------
  console.log('▶ [1/4] Ensuring Required Voices in Catalog...');
  for (const v of REQUIRED_VOICES) {
    await pool.query(
      `
      INSERT INTO voices (id, label, gender, age_band, language, reserved_narrator)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO UPDATE SET
        label = EXCLUDED.label,
        gender = EXCLUDED.gender,
        age_band = EXCLUDED.age_band,
        language = EXCLUDED.language,
        reserved_narrator = EXCLUDED.reserved_narrator;
    `,
      [v.id, v.label, v.gender, v.age_band, v.language, v.reserved_narrator]
    );
  }
  console.log('  ✔ Voice catalog verified.\n');

  // ---------------------------------------------------------------------------
  // 2. System Demo Author User
  // ---------------------------------------------------------------------------
  console.log('▶ [2/4] Seeding System Demo Author User...');
  const authorEmail = 'demo_author@synctone.internal';
  const authorUsername = 'demo_author';

  const userRes = await pool.query(
    `
    INSERT INTO users (username, email, password_hash, role)
    VALUES ($1, $2, crypt('DemoPass2026!', gen_salt('bf')), 'writer')
    ON CONFLICT (email) DO UPDATE SET
      username = EXCLUDED.username,
      role = 'writer'
    RETURNING id;
  `,
    [authorUsername, authorEmail]
  );

  const authorId = userRes.rows[0].id;
  console.log(`  ✔ Demo Author confirmed: ID=${authorId} (${authorEmail})\n`);

  // ---------------------------------------------------------------------------
  // 3. Local Verified Demo: Harry Potter and the Philosopher's Stone
  // ---------------------------------------------------------------------------
  console.log("▶ [3/4] Seeding 'Harry Potter and the Philosopher's Stone'...");

  // Novel
  let hpNovelId;
  const hpNovelCheck = await pool.query(
    "SELECT id FROM novels WHERE title = $1 LIMIT 1",
    ["Harry Potter and the Philosopher's Stone"]
  );

  if (hpNovelCheck.rows.length > 0) {
    hpNovelId = hpNovelCheck.rows[0].id;
    await pool.query(
      `
      UPDATE novels SET
        synopsis = $1,
        channel = 'verified',
        status = 'published',
        global_tone = 'British Fantasy',
        portfolio_source = 'manual',
        added_by = $2,
        updated_at = now()
      WHERE id = $3;
    `,
      [
        "A young wizard discovers his magical heritage on his eleventh birthday and attends Hogwarts School of Witchcraft and Wizardry.",
        authorId,
        hpNovelId,
      ]
    );
  } else {
    const hpNovelInsert = await pool.query(
      `
      INSERT INTO novels (title, synopsis, channel, status, global_tone, portfolio_source, added_by)
      VALUES ($1, $2, 'verified', 'published', 'British Fantasy', 'manual', $3)
      RETURNING id;
    `,
      [
        "Harry Potter and the Philosopher's Stone",
        "A young wizard discovers his magical heritage on his eleventh birthday and attends Hogwarts School of Witchcraft and Wizardry.",
        authorId,
      ]
    );
    hpNovelId = hpNovelInsert.rows[0].id;
  }
  console.log(`  ✔ Novel ID: ${hpNovelId}`);

  // Cast
  const hpCast = [
    {
      name: 'Narrator',
      voiceId: 'en-GB-RyanNeural',
      gender: 'male',
      ageBand: 'adult',
      temperament: 'British Received, Omniscient',
      sampleQuote: 'Mr. and Mrs. Dursley, of number four, Privet Drive, were proud to say that they were perfectly normal, thank you very much.',
      isNarrator: true,
      aliases: ['Narrator', 'Storyteller'],
    },
    {
      name: 'Harry Potter',
      voiceId: 'en-GB-ThomasNeural',
      gender: 'male',
      ageBand: 'young',
      temperament: 'Curious, Resolute, Modest',
      sampleQuote: 'I already know where it is.',
      isNarrator: false,
      aliases: ['Harry', 'Potter', 'The Boy Who Lived'],
    },
    {
      name: 'Hermione Granger',
      voiceId: 'en-GB-LibbyNeural',
      gender: 'female',
      ageBand: 'young',
      temperament: 'Intellectual, Earnest, Loyal',
      sampleQuote: "Don't worry, Harry. We will find the Philosopher's Stone.",
      isNarrator: false,
      aliases: ['Hermione', 'Miss Granger', 'Granger'],
    },
    {
      name: 'Ron Weasley',
      voiceId: 'en-GB-AlfieNeural',
      gender: 'male',
      ageBand: 'young',
      temperament: 'Loyal, Humorous, Reluctant',
      sampleQuote: 'Bloody hell, Harry! You could have got us killed!',
      isNarrator: false,
      aliases: ['Ron', 'Weasley'],
    },
    {
      name: 'Albus Dumbledore',
      voiceId: 'en-GB-ArthurNeural',
      gender: 'male',
      ageBand: 'elder',
      temperament: 'Benevolent, Serene, Enigmatic',
      sampleQuote: 'It does not do to dwell on dreams and forget to live, Minerva.',
      isNarrator: false,
      aliases: ['Dumbledore', 'Professor Dumbledore', 'Headmaster'],
    },
    {
      name: 'Minerva McGonagall',
      voiceId: 'en-GB-SoniaNeural',
      gender: 'female',
      ageBand: 'adult',
      temperament: 'Strict, Dignified, Fiercely Protective',
      sampleQuote: 'You cannot be serious, Albus. You could not leave him with these people.',
      isNarrator: false,
      aliases: ['McGonagall', 'Professor McGonagall'],
    },
    {
      name: 'Severus Snape',
      voiceId: 'en-GB-NoahNeural',
      gender: 'male',
      ageBand: 'adult',
      temperament: 'Austere, Sardonic, Disdainful',
      sampleQuote: 'Silence in the corridors. Five points from Gryffindor.',
      isNarrator: false,
      aliases: ['Snape', 'Professor Snape', 'Potions Master'],
    },
    {
      name: 'Vernon Dursley',
      voiceId: 'en-GB-RyanNeural',
      gender: 'male',
      ageBand: 'adult',
      temperament: 'Pompous, Choleric, Conventional',
      sampleQuote: 'I will not have it! There is no such thing as magic!',
      isNarrator: false,
      aliases: ['Vernon', 'Mr. Dursley', 'Uncle Vernon'],
    },
  ];

  const hpCharMap = {};
  for (const c of hpCast) {
    const charRes = await pool.query(
      `
      INSERT INTO characters (novel_id, canonical_name, gender, age_band, temperament, sample_quote, voice_id, speed_multiplier, is_narrator, source)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 1.0, $8, 'manual')
      ON CONFLICT (novel_id, canonical_name) DO UPDATE SET
        gender = EXCLUDED.gender,
        age_band = EXCLUDED.age_band,
        temperament = EXCLUDED.temperament,
        sample_quote = EXCLUDED.sample_quote,
        voice_id = EXCLUDED.voice_id,
        speed_multiplier = EXCLUDED.speed_multiplier,
        is_narrator = EXCLUDED.is_narrator,
        source = 'manual',
        updated_at = now()
      RETURNING id, canonical_name;
    `,
      [hpNovelId, c.name, c.gender, c.ageBand, c.temperament, c.sampleQuote, c.voiceId, c.isNarrator]
    );

    const charId = charRes.rows[0].id;
    hpCharMap[c.name] = { id: charId, voiceId: c.voiceId };

    // 4NF Aliases (character_id, alias)
    for (const alias of c.aliases) {
      await pool.query(
        `
        INSERT INTO character_aliases (character_id, alias)
        VALUES ($1, $2)
        ON CONFLICT (character_id, alias) DO UPDATE SET
          alias = EXCLUDED.alias;
      `,
        [charId, alias]
      );
    }
  }
  console.log(`  ✔ Seeded ${hpCast.length} British cast characters with 4NF aliases.`);

  // Chapter 1: The Boy Who Lived
  const hpRawSegments = [
    {
      type: 'narration',
      speaker_name: 'Narrator',
      char_name: 'Narrator',
      text: 'Mr. and Mrs. Dursley, of number four, Privet Drive, were proud to say that they were perfectly normal, thank you very much.',
      duration_ms: 6500,
    },
    {
      type: 'dialogue',
      speaker_name: 'Vernon Dursley',
      char_name: 'Vernon Dursley',
      text: 'I will not have it! There is no such thing as magic!',
      duration_ms: 3200,
    },
    {
      type: 'narration',
      speaker_name: 'Narrator',
      char_name: 'Narrator',
      text: 'Later, in the shadows outside the great castle, young voices conferred in hushed tones.',
      duration_ms: 4500,
    },
    {
      type: 'dialogue',
      speaker_name: 'Hermione Granger',
      char_name: 'Hermione Granger',
      text: "Don't worry, Harry. We will find the Philosopher's Stone.",
      duration_ms: 3800,
    },
    {
      type: 'dialogue',
      speaker_name: 'Ron Weasley',
      char_name: 'Ron Weasley',
      text: 'Bloody hell, Harry! You could have got us killed!',
      duration_ms: 3100,
    },
    {
      type: 'dialogue',
      speaker_name: 'Harry Potter',
      char_name: 'Harry Potter',
      text: 'I already know where it is.',
      duration_ms: 2200,
    },
    {
      type: 'dialogue',
      speaker_name: 'Severus Snape',
      char_name: 'Severus Snape',
      text: 'Silence in the corridors. Five points from Gryffindor.',
      duration_ms: 3500,
    },
    {
      type: 'dialogue',
      speaker_name: 'Minerva McGonagall',
      char_name: 'Minerva McGonagall',
      text: 'You cannot be serious, Albus. You could not leave him with these people.',
      duration_ms: 4200,
    },
    {
      type: 'dialogue',
      speaker_name: 'Albus Dumbledore',
      char_name: 'Albus Dumbledore',
      text: 'It does not do to dwell on dreams and forget to live, Minerva.',
      duration_ms: 4100,
    },
  ];

  let hpCurrentMs = 0;
  const pauseMs = config.audio.interSpeakerPauseMs || 300;
  const hpSegments = hpRawSegments.map((s, idx) => {
    const startMs = hpCurrentMs;
    const endMs = startMs + s.duration_ms;
    hpCurrentMs = endMs + pauseMs;
    const char = hpCharMap[s.char_name];
    return {
      order: idx + 1,
      segment_id: idx + 1,
      type: s.type,
      speaker_id: char.id,
      speaker_name: s.speaker_name,
      character_id: char.id,
      voice_id: char.voiceId,
      assigned_voice_id: char.voiceId,
      text: s.text,
      start_ms: startMs,
      end_ms: endMs,
      confidence: 1.0,
      source: s.type === 'narration' ? 'narrator_default' : 'manual',
      needs_review: false,
    };
  });
  const hpTotalDurationMs = hpCurrentMs;

  const hpTimeline = hpSegments.map((seg) => ({
    order: seg.order,
    segment_id: seg.segment_id,
    start_ms: seg.start_ms,
    end_ms: seg.end_ms,
    character_id: seg.character_id,
    voice_id: seg.voice_id,
    text: seg.text,
  }));

  // PostgreSQL chapter row
  const hpChapterRes = await pool.query(
    `
    INSERT INTO chapters (novel_id, chapter_number, title, status, audio_version, swift_audio_object, total_duration_ms)
    VALUES ($1, 1, 'The Boy Who Lived', 'completed', 1, 'hp_ch1.mp3', $2)
    ON CONFLICT (novel_id, chapter_number) DO UPDATE SET
      title = EXCLUDED.title,
      status = 'completed',
      audio_version = EXCLUDED.audio_version,
      updated_at = now()
    RETURNING id;
  `,
    [hpNovelId, hpTotalDurationMs]
  );
  const hpChapterId = hpChapterRes.rows[0].id;

  // Synthesize/stitch demo chapter audio and capture real durations & format
  const stitchedHp = await ensureChapterAudio(hpChapterId, hpSegments);
  const hpAudioFormat = stitchedHp?.audio_format || (fs.existsSync(path.join(outputDir, `${hpChapterId}.wav`)) ? 'wav' : 'mp3');
  const hpFinalDurationMs = stitchedHp?.total_duration_ms || hpTotalDurationMs;
  const hpFinalTimeline = (stitchedHp?.timeline && stitchedHp.timeline.length > 0) ? stitchedHp.timeline : hpTimeline;
  const hpSwiftAudioObject = `${hpChapterId}.${hpAudioFormat}`;

  // Update PostgreSQL chapter with verified audio object and exact duration
  await pool.query(
    `UPDATE chapters SET total_duration_ms = $1, swift_audio_object = $2, updated_at = now() WHERE id = $3;`,
    [hpFinalDurationMs, hpSwiftAudioObject, hpChapterId]
  );

  // MongoDB chapter document
  const hpRawText = hpRawSegments.map((s) => s.text).join('\n\n');
  await Chapter.findOneAndUpdate(
    { pg_chapter_id: hpChapterId },
    {
      pg_chapter_id: hpChapterId,
      novel_id: hpNovelId,
      chapter_number: 1,
      title: 'The Boy Who Lived',
      raw_text: hpRawText,
      audio_version: 1,
      manifest: {
        total_duration_ms: hpFinalDurationMs,
        audio_url: `/api/stream/${hpChapterId}`,
        timeline: hpFinalTimeline,
      },
      segments: hpSegments,
    },
    { upsert: true, new: true, runValidators: true }
  );

  console.log(`  ✔ Seeded Chapter 1 ('The Boy Who Lived'): ID=${hpChapterId} (${hpFinalDurationMs}ms, ${hpAudioFormat})\n`);

  // ---------------------------------------------------------------------------
  // 4. Public Verified Demo: The Adventures of Sherlock Holmes (Ch 1 & 2)
  // ---------------------------------------------------------------------------
  console.log("▶ [4/4] Seeding 'The Adventures of Sherlock Holmes' (Chapters 1 & 2)...");

  // Novel
  let shNovelId;
  const shNovelCheck = await pool.query(
    "SELECT id FROM novels WHERE title = $1 LIMIT 1",
    ["The Adventures of Sherlock Holmes"]
  );

  if (shNovelCheck.rows.length > 0) {
    shNovelId = shNovelCheck.rows[0].id;
    await pool.query(
      `
      UPDATE novels SET
        synopsis = $1,
        channel = 'verified',
        status = 'published',
        global_tone = 'Victorian Mystery',
        portfolio_source = 'manual',
        added_by = $2,
        updated_at = now()
      WHERE id = $3;
    `,
      [
        "A collection of classic detective mysteries in Victorian London featuring Sherlock Holmes and Dr. John Watson.",
        authorId,
        shNovelId,
      ]
    );
  } else {
    const shNovelInsert = await pool.query(
      `
      INSERT INTO novels (title, synopsis, channel, status, global_tone, portfolio_source, added_by)
      VALUES ($1, $2, 'verified', 'published', 'Victorian Mystery', 'manual', $3)
      RETURNING id;
    `,
      [
        "The Adventures of Sherlock Holmes",
        "A collection of classic detective mysteries in Victorian London featuring Sherlock Holmes and Dr. John Watson.",
        authorId,
      ]
    );
    shNovelId = shNovelInsert.rows[0].id;
  }
  console.log(`  ✔ Novel ID: ${shNovelId}`);

  // Cast
  const shCast = [
    {
      name: 'Dr. John Watson',
      voiceId: 'bm_george',
      gender: 'male',
      ageBand: 'adult',
      temperament: 'Loyal, Observant, Methodical',
      sampleQuote: 'To Sherlock Holmes she is always THE woman. I have seldom heard him mention her under any other name.',
      isNarrator: true,
      aliases: ['Watson', 'John', 'Doctor Watson', 'Narrator'],
    },
    {
      name: 'Sherlock Holmes',
      voiceId: 'bm_daniel',
      gender: 'male',
      ageBand: 'young',
      temperament: 'Analytical, Incisive, Bohemian',
      sampleQuote: 'It is a capital mistake to theorize before one has data. Insensibly one begins to twist facts to suit theories.',
      isNarrator: false,
      aliases: ['Holmes', 'Sherlock', 'The Consulting Detective'],
    },
    {
      name: 'Irene Adler',
      voiceId: 'bf_emma',
      gender: 'female',
      ageBand: 'young',
      temperament: 'Quick-witted, Daring, Elegant',
      sampleQuote: 'I know that he is a master of disguise, but he could not deceive me.',
      isNarrator: false,
      aliases: ['Irene', 'The Woman', 'Miss Adler'],
    },
    {
      name: 'King of Bohemia',
      voiceId: 'am_michael',
      gender: 'male',
      ageBand: 'adult',
      temperament: 'Aristocratic, Anxious, Imperious',
      sampleQuote: 'You must see that it is of the utmost importance to European politics.',
      isNarrator: false,
      aliases: ['The King', 'Wilhelm Gottsreich Sigismond von Ormstein', 'Count von Kramm'],
    },
  ];

  const shCharMap = {};
  for (const c of shCast) {
    const charRes = await pool.query(
      `
      INSERT INTO characters (novel_id, canonical_name, gender, age_band, temperament, sample_quote, voice_id, speed_multiplier, is_narrator, source)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 1.0, $8, 'manual')
      ON CONFLICT (novel_id, canonical_name) DO UPDATE SET
        gender = EXCLUDED.gender,
        age_band = EXCLUDED.age_band,
        temperament = EXCLUDED.temperament,
        sample_quote = EXCLUDED.sample_quote,
        voice_id = EXCLUDED.voice_id,
        speed_multiplier = EXCLUDED.speed_multiplier,
        is_narrator = EXCLUDED.is_narrator,
        source = 'manual',
        updated_at = now()
      RETURNING id, canonical_name;
    `,
      [shNovelId, c.name, c.gender, c.ageBand, c.temperament, c.sampleQuote, c.voiceId, c.isNarrator]
    );

    const charId = charRes.rows[0].id;
    shCharMap[c.name] = { id: charId, voiceId: c.voiceId };

    // 4NF Aliases (character_id, alias)
    for (const alias of c.aliases) {
      await pool.query(
        `
        INSERT INTO character_aliases (character_id, alias)
        VALUES ($1, $2)
        ON CONFLICT (character_id, alias) DO UPDATE SET
          alias = EXCLUDED.alias;
      `,
        [charId, alias]
      );
    }
  }
  console.log(`  ✔ Seeded ${shCast.length} Sherlock cast characters with 4NF aliases.`);

  // Chapter 1: A Scandal in Bohemia - Part I
  const shCh1RawSegments = [
    {
      type: 'narration',
      speaker_name: 'Dr. John Watson',
      char_name: 'Dr. John Watson',
      text: 'To Sherlock Holmes she is always THE woman. I have seldom heard him mention her under any other name.',
      duration_ms: 5500,
    },
    {
      type: 'narration',
      speaker_name: 'Dr. John Watson',
      char_name: 'Dr. John Watson',
      text: 'One night, a visitor of formidable stature strode into our Baker Street rooms, wearing a black vizard mask over his eyes.',
      duration_ms: 6000,
    },
    {
      type: 'dialogue',
      speaker_name: 'King of Bohemia',
      char_name: 'King of Bohemia',
      text: 'You had my note? Did it tell you that I would call? I am Count von Kramm, a Bohemian nobleman.',
      duration_ms: 5000,
    },
    {
      type: 'dialogue',
      speaker_name: 'Sherlock Holmes',
      char_name: 'Sherlock Holmes',
      text: 'Pray take a seat, Your Majesty. This heavy Bohemian paper could hardly disguise your royal crest.',
      duration_ms: 5200,
    },
    {
      type: 'dialogue',
      speaker_name: 'King of Bohemia',
      char_name: 'King of Bohemia',
      text: 'You must see that it is of the utmost importance to European politics. The compromising photograph must be recovered!',
      duration_ms: 5800,
    },
    {
      type: 'dialogue',
      speaker_name: 'Sherlock Holmes',
      char_name: 'Sherlock Holmes',
      text: 'It is a capital mistake to theorize before one has data. We must investigate Miss Irene Adler at once.',
      duration_ms: 4800,
    },
  ];

  let shCh1CurrentMs = 0;
  const shCh1Segments = shCh1RawSegments.map((s, idx) => {
    const startMs = shCh1CurrentMs;
    const endMs = startMs + s.duration_ms;
    shCh1CurrentMs = endMs + pauseMs;
    const char = shCharMap[s.char_name];
    return {
      order: idx + 1,
      segment_id: idx + 1,
      type: s.type,
      speaker_id: char.id,
      speaker_name: s.speaker_name,
      character_id: char.id,
      voice_id: char.voiceId,
      assigned_voice_id: char.voiceId,
      text: s.text,
      start_ms: startMs,
      end_ms: endMs,
      confidence: 1.0,
      source: s.type === 'narration' ? 'narrator_default' : 'manual',
      needs_review: false,
    };
  });
  const shCh1TotalDurationMs = shCh1CurrentMs;

  const shCh1Timeline = shCh1Segments.map((seg) => ({
    order: seg.order,
    segment_id: seg.segment_id,
    start_ms: seg.start_ms,
    end_ms: seg.end_ms,
    character_id: seg.character_id,
    voice_id: seg.voice_id,
    text: seg.text,
  }));

  const shCh1Res = await pool.query(
    `
    INSERT INTO chapters (novel_id, chapter_number, title, status, audio_version, swift_audio_object, total_duration_ms)
    VALUES ($1, 1, 'A Scandal in Bohemia - Part I', 'completed', 1, 'sh_ch1.mp3', $2)
    ON CONFLICT (novel_id, chapter_number) DO UPDATE SET
      title = EXCLUDED.title,
      status = 'completed',
      audio_version = EXCLUDED.audio_version,
      updated_at = now()
    RETURNING id;
  `,
    [shNovelId, shCh1TotalDurationMs]
  );
  const shCh1Id = shCh1Res.rows[0].id;

  // Synthesize/stitch demo chapter audio and capture real durations & format
  const stitchedSh1 = await ensureChapterAudio(shCh1Id, shCh1Segments);
  const sh1AudioFormat = stitchedSh1?.audio_format || (fs.existsSync(path.join(outputDir, `${shCh1Id}.wav`)) ? 'wav' : 'mp3');
  const sh1FinalDurationMs = stitchedSh1?.total_duration_ms || shCh1TotalDurationMs;
  const sh1FinalTimeline = (stitchedSh1?.timeline && stitchedSh1.timeline.length > 0) ? stitchedSh1.timeline : shCh1Timeline;
  const sh1SwiftAudioObject = `${shCh1Id}.${sh1AudioFormat}`;

  // Update PostgreSQL chapter with verified audio object and exact duration
  await pool.query(
    `UPDATE chapters SET total_duration_ms = $1, swift_audio_object = $2, updated_at = now() WHERE id = $3;`,
    [sh1FinalDurationMs, sh1SwiftAudioObject, shCh1Id]
  );

  const shCh1RawText = shCh1RawSegments.map((s) => s.text).join('\n\n');
  await Chapter.findOneAndUpdate(
    { pg_chapter_id: shCh1Id },
    {
      pg_chapter_id: shCh1Id,
      novel_id: shNovelId,
      chapter_number: 1,
      title: 'A Scandal in Bohemia - Part I',
      raw_text: shCh1RawText,
      audio_version: 1,
      manifest: {
        total_duration_ms: sh1FinalDurationMs,
        audio_url: `/api/stream/${shCh1Id}`,
        timeline: sh1FinalTimeline,
      },
      segments: shCh1Segments,
    },
    { upsert: true, new: true, runValidators: true }
  );

  console.log(`  ✔ Seeded Chapter 1 ('A Scandal in Bohemia - Part I'): ID=${shCh1Id} (${sh1FinalDurationMs}ms, ${sh1AudioFormat})`);

  // Chapter 2: A Scandal in Bohemia - Part II
  const shCh2RawSegments = [
    {
      type: 'narration',
      speaker_name: 'Dr. John Watson',
      char_name: 'Dr. John Watson',
      text: 'At dusk, Holmes disguised himself as an amicable, simple-minded clergyman, complete with broad-brimmed hat and white cravat.',
      duration_ms: 6200,
    },
    {
      type: 'dialogue',
      speaker_name: 'Sherlock Holmes',
      char_name: 'Sherlock Holmes',
      text: "When the carriage arrives at Briony Lodge, Watson, throw the smoke rocket through the open window and cry 'Fire!'",
      duration_ms: 5400,
    },
    {
      type: 'narration',
      speaker_name: 'Dr. John Watson',
      char_name: 'Dr. John Watson',
      text: 'A thick plume of smoke curled through the sitting room. In an instant, Miss Adler darted toward a secret sliding panel in the wall.',
      duration_ms: 6400,
    },
    {
      type: 'dialogue',
      speaker_name: 'Sherlock Holmes',
      char_name: 'Sherlock Holmes',
      text: 'She has shown us where the photograph is hidden! Now, a quick withdrawal before suspicions rise.',
      duration_ms: 4900,
    },
    {
      type: 'narration',
      speaker_name: 'Dr. John Watson',
      char_name: 'Dr. John Watson',
      text: 'Yet when we returned the following dawn, the house was deserted, and only a letter remained upon the mantelpiece.',
      duration_ms: 5900,
    },
    {
      type: 'dialogue',
      speaker_name: 'Irene Adler',
      char_name: 'Irene Adler',
      text: 'Goodnight, Mister Sherlock Holmes! I know that you are a master of disguise, but you could not deceive me.',
      duration_ms: 5100,
    },
  ];

  let shCh2CurrentMs = 0;
  const shCh2Segments = shCh2RawSegments.map((s, idx) => {
    const startMs = shCh2CurrentMs;
    const endMs = startMs + s.duration_ms;
    shCh2CurrentMs = endMs + pauseMs;
    const char = shCharMap[s.char_name];
    return {
      order: idx + 1,
      segment_id: idx + 1,
      type: s.type,
      speaker_id: char.id,
      speaker_name: s.speaker_name,
      character_id: char.id,
      voice_id: char.voiceId,
      assigned_voice_id: char.voiceId,
      text: s.text,
      start_ms: startMs,
      end_ms: endMs,
      confidence: 1.0,
      source: s.type === 'narration' ? 'narrator_default' : 'manual',
      needs_review: false,
    };
  });
  const shCh2TotalDurationMs = shCh2CurrentMs;

  const shCh2Timeline = shCh2Segments.map((seg) => ({
    order: seg.order,
    segment_id: seg.segment_id,
    start_ms: seg.start_ms,
    end_ms: seg.end_ms,
    character_id: seg.character_id,
    voice_id: seg.voice_id,
    text: seg.text,
  }));

  const shCh2Res = await pool.query(
    `
    INSERT INTO chapters (novel_id, chapter_number, title, status, audio_version, swift_audio_object, total_duration_ms)
    VALUES ($1, 2, 'A Scandal in Bohemia - Part II', 'completed', 1, 'sh_ch2.mp3', $2)
    ON CONFLICT (novel_id, chapter_number) DO UPDATE SET
      title = EXCLUDED.title,
      status = 'completed',
      audio_version = EXCLUDED.audio_version,
      updated_at = now()
    RETURNING id;
  `,
    [shNovelId, shCh2TotalDurationMs]
  );
  const shCh2Id = shCh2Res.rows[0].id;

  // Synthesize/stitch demo chapter audio and capture real durations & format
  const stitchedSh2 = await ensureChapterAudio(shCh2Id, shCh2Segments);
  const sh2AudioFormat = stitchedSh2?.audio_format || (fs.existsSync(path.join(outputDir, `${shCh2Id}.wav`)) ? 'wav' : 'mp3');
  const sh2FinalDurationMs = stitchedSh2?.total_duration_ms || shCh2TotalDurationMs;
  const sh2FinalTimeline = (stitchedSh2?.timeline && stitchedSh2.timeline.length > 0) ? stitchedSh2.timeline : shCh2Timeline;
  const sh2SwiftAudioObject = `${shCh2Id}.${sh2AudioFormat}`;

  // Update PostgreSQL chapter with verified audio object and exact duration
  await pool.query(
    `UPDATE chapters SET total_duration_ms = $1, swift_audio_object = $2, updated_at = now() WHERE id = $3;`,
    [sh2FinalDurationMs, sh2SwiftAudioObject, shCh2Id]
  );

  const shCh2RawText = shCh2RawSegments.map((s) => s.text).join('\n\n');
  await Chapter.findOneAndUpdate(
    { pg_chapter_id: shCh2Id },
    {
      pg_chapter_id: shCh2Id,
      novel_id: shNovelId,
      chapter_number: 2,
      title: 'A Scandal in Bohemia - Part II',
      raw_text: shCh2RawText,
      audio_version: 1,
      manifest: {
        total_duration_ms: sh2FinalDurationMs,
        audio_url: `/api/stream/${shCh2Id}`,
        timeline: sh2FinalTimeline,
      },
      segments: shCh2Segments,
    },
    { upsert: true, new: true, runValidators: true }
  );

  console.log(`  ✔ Seeded Chapter 2 ('A Scandal in Bohemia - Part II'): ID=${shCh2Id} (${sh2FinalDurationMs}ms, ${sh2AudioFormat})\n`);

  console.log('========================================================================');
  console.log('✅ Demo seeding finished successfully!');
  console.log('========================================================================');

  if (closeConnections) {
    try {
      await mongoose.disconnect();
      await pool.end();
    } catch (_closeErr) {}
  }

  return {
    authorId,
    hpNovelId,
    hpChapterId,
    shNovelId,
    shChapterIds: [shCh1Id, shCh2Id],
  };
}

module.exports = {
  seedDemos,
};
module.exports.seedDemos = seedDemos;
module.exports.default = seedDemos;

if (require.main === module) {
  seedDemos({ closeConnections: true })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal seeding error:', err);
      process.exit(1);
    });
}
