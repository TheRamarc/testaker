import Database from '@tauri-apps/plugin-sql';

let db: Database | null = null;
let writeQueue: Promise<void> = Promise.resolve();

async function getDb() {
  if (!db) {
    db = await Database.load('sqlite:tnpsc.db');
  }
  return db;
}

async function runWriteBatch<T>(work: () => Promise<T>) {
  const result = writeQueue.then(work, work);
  writeQueue = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

export interface Option {
  id?: number;
  text: string;
  isCorrect: boolean;
}

export interface Topic {
  id: number;
  name: string;
  created_at: string;
}

export interface Question {
  id?: number;
  text: string;
  imagePath: string | null;
  topicId: number | null;
  textTestId?: number | null;
  options: Option[];
}

export interface PdfAnswer {
  id?: number;
  pdfTestId?: number;
  questionNumber: number;
  correctOption: string;
}

export interface PdfTestAttempt {
  id?: number;
  pdfTestId: number;
  score: number;
  totalQuestions: number;
  durationSeconds: number;
  attemptedAt: string;
}

export interface PdfTest {
  id?: number;
  name: string;
  pdfPath: string;
  sourcePdfPath?: string | null;
  topicId: number | null;
  answers: PdfAnswer[];
  lastAttempt?: PdfTestAttempt | null;
}

export interface TextTestAttempt {
  id?: number;
  textTestId: number;
  score: number;
  totalQuestions: number;
  durationSeconds: number;
  attemptedAt: string;
}

export interface TextTest {
  id?: number;
  name: string;
  topicId: number | null;
  questions: Question[];
  previewImagePath?: string | null;
  lastAttempt?: TextTestAttempt | null;
}

export type TextTestQuestionInput = Omit<Question, 'imagePath'> & {
  imagePath?: string | null;
};

export interface PdfMaterial {
  id?: number;
  name: string;
  pdfPath: string;
  sourcePdfPath?: string | null;
  topicId: number | null;
  created_at?: string;
  last_opened_at?: string | null;
  total_study_seconds?: number;
}

interface OptionRow {
  id: number;
  text: string;
  is_correct: boolean | number;
}

interface QuestionRow {
  id: number;
  text: string;
  image_path: string | null;
  topic_id: number | null;
  text_test_id?: number | null;
  created_at?: string;
}

interface IdRow {
  id: number;
}

interface PdfTestRow {
  id: number;
  name: string;
  pdf_path: string;
  source_pdf_path: string | null;
  topic_id: number | null;
  created_at?: string;
}

interface PdfTestListRow extends PdfTestRow {
  last_attempt_id: number | null;
  last_score: number | null;
  last_total_questions: number | null;
  last_duration_seconds: number | null;
  last_attempted_at: string | null;
}

interface PdfAnswerRow {
  id: number;
  question_number: number;
  correct_option: string;
}

interface PdfMaterialRow {
  id: number;
  name: string;
  pdf_path: string;
  source_pdf_path: string | null;
  topic_id: number | null;
  created_at?: string;
  last_opened_at?: string | null;
  total_study_seconds?: number | null;
}

interface RecentPdfAttemptRow {
  id: number;
  pdf_test_id: number;
  score: number;
  total_questions: number;
  duration_seconds: number;
  attempted_at: string;
  test_name: string;
}

interface RecentTextAttemptRow {
  id: number;
  text_test_id: number;
  score: number;
  total_questions: number;
  duration_seconds: number;
  attempted_at: string;
  test_name: string;
}

interface TextTestRow {
  id: number;
  name: string;
  topic_id: number | null;
  created_at?: string;
}

interface TextTestListRow extends TextTestRow {
  preview_image_path: string | null;
  last_attempt_id: number | null;
  last_score: number | null;
  last_total_questions: number | null;
  last_duration_seconds: number | null;
  last_attempted_at: string | null;
}

export async function createTopic(name: string) {
  const db = await getDb();
  const result = await db.execute('INSERT INTO topics (name) VALUES ($1)', [name]);
  return result.lastInsertId;
}

export async function getAllTopics(): Promise<Topic[]> {
  const db = await getDb();
  return await db.select<Topic[]>('SELECT * FROM topics ORDER BY name ASC');
}

export async function saveQuestion(question: Question) {
  const db = await getDb();
  try {
    return await runWriteBatch(() => insertQuestion(db, question));
  } catch (error) {
    console.error('Failed to save question:', error);
    throw error;
  }
}

async function insertQuestion(database: Database, question: Question) {
  const result = await database.execute(
    'INSERT INTO questions (text, image_path, topic_id, text_test_id) VALUES ($1, $2, $3, $4)',
    [question.text, question.imagePath, question.topicId, question.textTestId ?? null]
  );
  const questionId = result.lastInsertId;
  for (const option of question.options) {
    await database.execute(
      'INSERT INTO options (question_id, text, is_correct) VALUES ($1, $2, $3)',
      [questionId, option.text, option.isCorrect]
    );
  }
  return questionId;
}

function mapOptions(options: OptionRow[]): Option[] {
  return options.map(opt => ({
    id: opt.id,
    text: opt.text,
    isCorrect: !!opt.is_correct
  }));
}

function mapPdfTestRow(test: PdfTestRow, answers: PdfAnswer[] = []): PdfTest {
  return {
    id: test.id,
    name: test.name,
    pdfPath: test.pdf_path,
    sourcePdfPath: test.source_pdf_path,
    topicId: test.topic_id,
    answers
  };
}

function mapPdfTestListRow(test: PdfTestListRow): PdfTest {
  return {
    ...mapPdfTestRow(test),
    lastAttempt: test.last_attempt_id ? {
      id: test.last_attempt_id,
      pdfTestId: test.id,
      score: test.last_score ?? 0,
      totalQuestions: test.last_total_questions ?? 0,
      durationSeconds: test.last_duration_seconds ?? 0,
      attemptedAt: test.last_attempted_at ?? ''
    } : null
  };
}

function mapPdfMaterialRow(material: PdfMaterialRow): PdfMaterial {
  return {
    id: material.id,
    name: material.name,
    pdfPath: material.pdf_path,
    sourcePdfPath: material.source_pdf_path,
    topicId: material.topic_id,
    created_at: material.created_at,
    last_opened_at: material.last_opened_at,
    total_study_seconds: material.total_study_seconds ?? 0
  };
}

function mapTextTestListRow(test: TextTestListRow): TextTest {
  return {
    id: test.id,
    name: test.name,
    topicId: test.topic_id,
    questions: [],
    previewImagePath: test.preview_image_path,
    lastAttempt: test.last_attempt_id ? {
      id: test.last_attempt_id,
      textTestId: test.id,
      score: test.last_score ?? 0,
      totalQuestions: test.last_total_questions ?? 0,
      durationSeconds: test.last_duration_seconds ?? 0,
      attemptedAt: test.last_attempted_at ?? ''
    } : null
  };
}

export async function getAllQuestions() {
  const db = await getDb();
  const questions = await db.select<(QuestionRow & { options?: Option[]; topicId?: number | null })[]>('SELECT * FROM questions ORDER BY created_at DESC');
  for (const q of questions) {
    const rawOptions = await db.select<OptionRow[]>('SELECT * FROM options WHERE question_id = $1', [q.id]);
    q.options = mapOptions(rawOptions);
    q.topicId = q.topic_id;
  }
  return questions.map(q => ({
    id: q.id,
    text: q.text,
    imagePath: q.image_path,
    topicId: q.topic_id,
    textTestId: q.text_test_id,
    options: q.options ?? []
  }));
}

export async function updateQuestion(question: Question) {
  if (!question.id) throw new Error('Question ID is required');
  const db = await getDb();
  try {
    await runWriteBatch(async () => {
      await db.execute(
        'UPDATE questions SET text = $1, image_path = $2, topic_id = $3 WHERE id = $4',
        [question.text, question.imagePath, question.topicId, question.id]
      );
      await db.execute('DELETE FROM options WHERE question_id = $1', [question.id]);
      for (const option of question.options) {
        await db.execute(
          'INSERT INTO options (question_id, text, is_correct) VALUES ($1, $2, $3)',
          [question.id, option.text, option.isCorrect]
        );
      }
    });
  } catch (error) {
    throw error;
  }
}

export async function deleteQuestion(id: number) {
  const db = await getDb();
  await runWriteBatch(async () => {
    await db.execute('DELETE FROM options WHERE question_id = $1', [id]);
    await db.execute('DELETE FROM questions WHERE id = $1', [id]);
  });
}

export async function getQuestionsByTopic(topicId: number): Promise<Question[]> {
  const db = await getDb();
  const questions = await db.select<(QuestionRow & { options?: Option[]; topicId?: number | null })[]>(
    'SELECT * FROM questions WHERE topic_id = $1 ORDER BY created_at DESC',
    [topicId]
  );
  for (const q of questions) {
    const rawOptions = await db.select<OptionRow[]>('SELECT * FROM options WHERE question_id = $1', [q.id]);
    q.options = mapOptions(rawOptions);
    q.topicId = q.topic_id;
  }
  return questions.map(q => ({
    id: q.id,
    text: q.text,
    imagePath: q.image_path,
    topicId: q.topic_id,
    textTestId: q.text_test_id,
    options: q.options ?? []
  }));
}

export async function getRandomQuestions(questionsPerTopic: number): Promise<Question[]> {
  const db = await getDb();
  const topics = await getAllTopics();
  let allSelectedQuestions: Question[] = [];
  for (const topic of topics) {
    const questions = await db.select<QuestionRow[]>(
      'SELECT * FROM questions WHERE topic_id = $1 ORDER BY RANDOM() LIMIT $2',
      [topic.id, questionsPerTopic]
    );
    for (const q of questions) {
      const rawOptions = await db.select<OptionRow[]>('SELECT * FROM options WHERE question_id = $1', [q.id]);
      allSelectedQuestions.push({
        id: q.id,
        text: q.text,
        imagePath: q.image_path,
        topicId: q.topic_id,
        textTestId: q.text_test_id,
        options: mapOptions(rawOptions)
      });
    }
  }
  return allSelectedQuestions.sort(() => Math.random() - 0.5);
}

export async function savePdfTest(test: PdfTest) {
  const db = await getDb();
  try {
    return await runWriteBatch(async () => {
      const result = await db.execute(
        'INSERT INTO pdf_tests (name, pdf_path, source_pdf_path, topic_id) VALUES ($1, $2, $3, $4)',
        [test.name, test.pdfPath, test.sourcePdfPath ?? null, test.topicId]
      );
      const pdfTestId = result.lastInsertId;
      for (const ans of test.answers) {
        await db.execute(
          'INSERT INTO pdf_answers (pdf_test_id, question_number, correct_option) VALUES ($1, $2, $3)',
          [pdfTestId, ans.questionNumber, ans.correctOption]
        );
      }
      return pdfTestId;
    });
  } catch (error) {
    console.error('Failed to save PDF test:', error);
    throw error;
  }
}

export async function getAllPdfTests(): Promise<PdfTest[]> {
  const db = await getDb();
  const tests = await db.select<PdfTestListRow[]>(`
    SELECT
      t.*,
      a.id AS last_attempt_id,
      a.score AS last_score,
      a.total_questions AS last_total_questions,
      a.duration_seconds AS last_duration_seconds,
      a.attempted_at AS last_attempted_at
    FROM pdf_tests t
    LEFT JOIN pdf_test_attempts a ON a.id = (
      SELECT id
      FROM pdf_test_attempts
      WHERE pdf_test_id = t.id
      ORDER BY attempted_at DESC, id DESC
      LIMIT 1
    )
    ORDER BY t.created_at DESC
  `);

  return tests.map(mapPdfTestListRow);
}

export async function getPdfTestById(id: number): Promise<PdfTest | null> {
  const db = await getDb();
  const tests = await db.select<PdfTestRow[]>('SELECT * FROM pdf_tests WHERE id = $1', [id]);
  if (tests.length === 0) return null;
  const test = tests[0];
  const answers = await db.select<PdfAnswerRow[]>(
    'SELECT * FROM pdf_answers WHERE pdf_test_id = $1 ORDER BY question_number ASC',
    [id]
  );
  return mapPdfTestRow(
    test,
    answers.map(a => ({
      id: a.id,
      questionNumber: a.question_number,
      correctOption: a.correct_option
    }))
  );
}

export async function savePdfTestAttempt(attempt: Omit<PdfTestAttempt, 'id'>) {
  const db = await getDb();
  const result = await db.execute(
    'INSERT INTO pdf_test_attempts (pdf_test_id, score, total_questions, duration_seconds, attempted_at) VALUES ($1, $2, $3, $4, $5)',
    [attempt.pdfTestId, attempt.score, attempt.totalQuestions, attempt.durationSeconds, attempt.attemptedAt]
  );
  return result.lastInsertId;
}

export async function saveTextTestAttempt(attempt: Omit<TextTestAttempt, 'id'>) {
  const db = await getDb();
  const result = await db.execute(
    'INSERT INTO text_test_attempts (text_test_id, score, total_questions, duration_seconds, attempted_at) VALUES ($1, $2, $3, $4, $5)',
    [attempt.textTestId, attempt.score, attempt.totalQuestions, attempt.durationSeconds, attempt.attemptedAt]
  );
  return result.lastInsertId;
}

export async function savePdfMaterial(material: PdfMaterial) {
  const db = await getDb();
  try {
    const result = await db.execute(
      'INSERT INTO pdf_materials (name, pdf_path, source_pdf_path, topic_id) VALUES ($1, $2, $3, $4)',
      [material.name, material.pdfPath, material.sourcePdfPath ?? null, material.topicId]
    );
    return result.lastInsertId;
  } catch (error) {
    console.error('Failed to save PDF material:', error);
    throw error;
  }
}

export async function getPdfMaterialsByTopic(topicId: number): Promise<PdfMaterial[]> {
  const db = await getDb();
  const materials = await db.select<PdfMaterialRow[]>('SELECT * FROM pdf_materials WHERE topic_id = $1 ORDER BY created_at DESC', [topicId]);
  return materials.map(mapPdfMaterialRow);
}

export async function getAllPdfMaterials(): Promise<PdfMaterial[]> {
  const db = await getDb();
  const materials = await db.select<PdfMaterialRow[]>('SELECT * FROM pdf_materials ORDER BY created_at DESC');
  return materials.map(mapPdfMaterialRow);
}

export async function getPdfTestsByTopic(topicId: number): Promise<PdfTest[]> {
  const db = await getDb();
  const tests = await db.select<PdfTestListRow[]>(`
    SELECT
      t.*,
      a.id AS last_attempt_id,
      a.score AS last_score,
      a.total_questions AS last_total_questions,
      a.duration_seconds AS last_duration_seconds,
      a.attempted_at AS last_attempted_at
    FROM pdf_tests t
    LEFT JOIN pdf_test_attempts a ON a.id = (
      SELECT id
      FROM pdf_test_attempts
      WHERE pdf_test_id = t.id
      ORDER BY attempted_at DESC, id DESC
      LIMIT 1
    )
    WHERE t.topic_id = $1
    ORDER BY t.created_at DESC
  `, [topicId]);

  return tests.map(mapPdfTestListRow);
}

export async function markPdfMaterialOpened(id: number) {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.execute('UPDATE pdf_materials SET last_opened_at = $1 WHERE id = $2', [now, id]);
}

export interface RecentTestAttempt {
  id?: number;
  testId: number;
  testType: 'pdf' | 'text';
  score: number;
  totalQuestions: number;
  durationSeconds: number;
  attemptedAt: string;
  testName: string;
}

export async function getRecentTestAttempts(limit: number = 5): Promise<RecentTestAttempt[]> {
  const db = await getDb();
  
  const pdfAttempts = await db.select<RecentPdfAttemptRow[]>(`
    SELECT a.*, t.name as test_name
    FROM pdf_test_attempts a
    JOIN pdf_tests t ON a.pdf_test_id = t.id
  `);
  
  const textAttempts = await db.select<RecentTextAttemptRow[]>(`
    SELECT a.*, t.name as test_name
    FROM text_test_attempts a
    JOIN text_tests t ON a.text_test_id = t.id
  `);

  const allAttempts: RecentTestAttempt[] = [
    ...pdfAttempts.map(a => ({
      id: a.id,
      testId: a.pdf_test_id,
      testType: 'pdf' as const,
      score: a.score,
      totalQuestions: a.total_questions,
      durationSeconds: a.duration_seconds,
      attemptedAt: a.attempted_at,
      testName: a.test_name
    })),
    ...textAttempts.map(a => ({
      id: a.id,
      testId: a.text_test_id,
      testType: 'text' as const,
      score: a.score,
      totalQuestions: a.total_questions,
      durationSeconds: a.duration_seconds,
      attemptedAt: a.attempted_at,
      testName: a.test_name
    }))
  ];

  allAttempts.sort((a, b) => new Date(b.attemptedAt).getTime() - new Date(a.attemptedAt).getTime());
  return allAttempts.slice(0, limit);
}

export async function getRecentMaterials(limit: number = 5): Promise<PdfMaterial[]> {
  const db = await getDb();
  const materials = await db.select<PdfMaterialRow[]>(`
    SELECT * FROM pdf_materials 
    WHERE last_opened_at IS NOT NULL 
    ORDER BY last_opened_at DESC 
    LIMIT $1
  `, [limit]);

  return materials.map(mapPdfMaterialRow);
}

export async function addMaterialStudyTime(id: number, seconds: number) {
  const db = await getDb();
  await db.execute(
    'UPDATE pdf_materials SET total_study_seconds = COALESCE(total_study_seconds, 0) + $1 WHERE id = $2',
    [seconds, id]
  );
}

export async function deletePdfMaterial(id: number) {
  const db = await getDb();
  await db.execute('DELETE FROM pdf_materials WHERE id = $1', [id]);
}

export async function deletePdfTest(id: number) {
  const db = await getDb();
  await runWriteBatch(async () => {
    await db.execute('DELETE FROM pdf_answers WHERE pdf_test_id = $1', [id]);
    await db.execute('DELETE FROM pdf_test_attempts WHERE pdf_test_id = $1', [id]);
    await db.execute('DELETE FROM pdf_tests WHERE id = $1', [id]);
  });
}

export async function deleteTopic(id: number) {
  const db = await getDb();
  await runWriteBatch(async () => {
    const tests = await db.select<IdRow[]>('SELECT id FROM pdf_tests WHERE topic_id = $1', [id]);
    for (const t of tests) {
      await db.execute('DELETE FROM pdf_answers WHERE pdf_test_id = $1', [t.id]);
      await db.execute('DELETE FROM pdf_test_attempts WHERE pdf_test_id = $1', [t.id]);
      await db.execute('DELETE FROM pdf_tests WHERE id = $1', [t.id]);
    }

    await db.execute('DELETE FROM pdf_materials WHERE topic_id = $1', [id]);
    await db.execute('DELETE FROM options WHERE question_id IN (SELECT id FROM questions WHERE text_test_id IN (SELECT id FROM text_tests WHERE topic_id = $1))', [id]);
    await db.execute('DELETE FROM questions WHERE text_test_id IN (SELECT id FROM text_tests WHERE topic_id = $1)', [id]);
    await db.execute('DELETE FROM text_test_attempts WHERE text_test_id IN (SELECT id FROM text_tests WHERE topic_id = $1)', [id]);
    await db.execute('DELETE FROM text_tests WHERE topic_id = $1', [id]);
    await db.execute('DELETE FROM topics WHERE id = $1', [id]);
  });
}

export async function updateTopicName(id: number, name: string) {
  const db = await getDb();
  await db.execute('UPDATE topics SET name = $1 WHERE id = $2', [name, id]);
}

export async function updatePdfMaterialName(id: number, name: string) {
  const db = await getDb();
  await db.execute('UPDATE pdf_materials SET name = $1 WHERE id = $2', [name, id]);
}

export async function updatePdfTestName(id: number, name: string) {
  const db = await getDb();
  await db.execute('UPDATE pdf_tests SET name = $1 WHERE id = $2', [name, id]);
}

export async function saveTextTest(test: TextTest) {
  const db = await getDb();
  try {
    return await runWriteBatch(async () => {
      const result = await db.execute(
        'INSERT INTO text_tests (name, topic_id) VALUES ($1, $2)',
        [test.name, test.topicId]
      );
      const testId = result.lastInsertId;

      for (const q of test.questions) {
        await insertQuestion(db, {
          ...q,
          textTestId: testId,
          topicId: test.topicId
        });
      }

      return testId;
    });
  } catch (error) {
    console.error('Failed to save Text test:', error);
    throw error;
  }
}

export async function getAllTextTests(): Promise<TextTest[]> {
  const db = await getDb();
  const tests = await db.select<TextTestListRow[]>(`
    SELECT
      t.*,
      (
        SELECT image_path
        FROM questions
        WHERE text_test_id = t.id AND image_path IS NOT NULL
        ORDER BY id ASC
        LIMIT 1
      ) AS preview_image_path,
      a.id AS last_attempt_id,
      a.score AS last_score,
      a.total_questions AS last_total_questions,
      a.duration_seconds AS last_duration_seconds,
      a.attempted_at AS last_attempted_at
    FROM text_tests t
    LEFT JOIN text_test_attempts a ON a.id = (
      SELECT id
      FROM text_test_attempts
      WHERE text_test_id = t.id
      ORDER BY attempted_at DESC, id DESC
      LIMIT 1
    )
    ORDER BY t.created_at DESC
  `);

  return tests.map(mapTextTestListRow);
}

export async function getTextTestsByTopic(topicId: number): Promise<TextTest[]> {
  const db = await getDb();
  const tests = await db.select<TextTestListRow[]>(`
    SELECT
      t.*,
      (
        SELECT image_path
        FROM questions
        WHERE text_test_id = t.id AND image_path IS NOT NULL
        ORDER BY id ASC
        LIMIT 1
      ) AS preview_image_path,
      a.id AS last_attempt_id,
      a.score AS last_score,
      a.total_questions AS last_total_questions,
      a.duration_seconds AS last_duration_seconds,
      a.attempted_at AS last_attempted_at
    FROM text_tests t
    LEFT JOIN text_test_attempts a ON a.id = (
      SELECT id
      FROM text_test_attempts
      WHERE text_test_id = t.id
      ORDER BY attempted_at DESC, id DESC
      LIMIT 1
    )
    WHERE t.topic_id = $1
    ORDER BY t.created_at DESC
  `, [topicId]);

  return tests.map(mapTextTestListRow);
}

export async function deleteTextTest(id: number) {
  const db = await getDb();
  await runWriteBatch(async () => {
    await db.execute('DELETE FROM options WHERE question_id IN (SELECT id FROM questions WHERE text_test_id = $1)', [id]);
    await db.execute('DELETE FROM questions WHERE text_test_id = $1', [id]);
    await db.execute('DELETE FROM text_test_attempts WHERE text_test_id = $1', [id]);
    await db.execute('DELETE FROM text_tests WHERE id = $1', [id]);
  });
}

export async function updateTextTestName(id: number, name: string) {
  const db = await getDb();
  await db.execute('UPDATE text_tests SET name = $1 WHERE id = $2', [name, id]);
}

export async function getTextTestById(id: number): Promise<TextTest | null> {
  const db = await getDb();
  const tests = await db.select<TextTestRow[]>('SELECT * FROM text_tests WHERE id = $1', [id]);
  if (tests.length === 0) return null;
  const t = tests[0];

  const rawQuestions = await db.select<QuestionRow[]>('SELECT * FROM questions WHERE text_test_id = $1 ORDER BY created_at ASC', [id]);
  const questions: Question[] = [];
  for (const rq of rawQuestions) {
    const rawOptions = await db.select<OptionRow[]>('SELECT * FROM options WHERE question_id = $1', [rq.id]);
    questions.push({
      id: rq.id,
      text: rq.text,
      imagePath: rq.image_path,
      topicId: rq.topic_id,
      textTestId: rq.text_test_id,
      options: mapOptions(rawOptions)
    });
  }

  return {
    id: t.id,
    name: t.name,
    topicId: t.topic_id,
    questions
  };
}
