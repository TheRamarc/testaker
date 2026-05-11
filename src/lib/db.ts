import Database from '@tauri-apps/plugin-sql';

let db: Database | null = null;

async function getDb() {
  if (!db) {
    db = await Database.load('sqlite:tnpsc.db');
  }
  return db;
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
    const result = await db.execute(
      'INSERT INTO questions (text, image_path, topic_id) VALUES ($1, $2, $3)',
      [question.text, null, question.topicId]
    );
    const questionId = result.lastInsertId;
    for (const option of question.options) {
      await db.execute(
        'INSERT INTO options (question_id, text, is_correct) VALUES ($1, $2, $3)',
        [questionId, option.text, option.isCorrect]
      );
    }
    return questionId;
  } catch (error) {
    console.error('Failed to save question:', error);
    throw error;
  }
}

async function mapOptions(options: any[]): Promise<Option[]> {
  return options.map(opt => ({
    id: opt.id,
    text: opt.text,
    isCorrect: !!opt.is_correct
  }));
}

export async function getAllQuestions() {
  const db = await getDb();
  const questions = await db.select<any[]>('SELECT * FROM questions ORDER BY created_at DESC');
  for (const q of questions) {
    const rawOptions = await db.select<any[]>('SELECT * FROM options WHERE question_id = $1', [q.id]);
    q.options = await mapOptions(rawOptions);
    q.topicId = q.topic_id;
  }
  return questions;
}

export async function updateQuestion(question: Question) {
  if (!question.id) throw new Error('Question ID is required');
  const db = await getDb();
  try {
    await db.execute(
      'UPDATE questions SET text = $1, image_path = $2, topic_id = $3 WHERE id = $4',
      [question.text, null, question.topicId, question.id]
    );
    await db.execute('DELETE FROM options WHERE question_id = $1', [question.id]);
    for (const option of question.options) {
      await db.execute(
        'INSERT INTO options (question_id, text, is_correct) VALUES ($1, $2, $3)',
        [question.id, option.text, option.isCorrect]
      );
    }
  } catch (error) {
    throw error;
  }
}

export async function deleteQuestion(id: number) {
  const db = await getDb();
  await db.execute('DELETE FROM options WHERE question_id = $1', [id]);
  await db.execute('DELETE FROM questions WHERE id = $1', [id]);
}

export async function getQuestionsByTopic(topicId: number): Promise<Question[]> {
  const db = await getDb();
  const questions = await db.select<any[]>(
    'SELECT * FROM questions WHERE topic_id = $1 ORDER BY created_at DESC',
    [topicId]
  );
  for (const q of questions) {
    const rawOptions = await db.select<any[]>('SELECT * FROM options WHERE question_id = $1', [q.id]);
    q.options = await mapOptions(rawOptions);
    q.topicId = q.topic_id;
  }
  return questions;
}

export async function getRandomQuestions(questionsPerTopic: number): Promise<Question[]> {
  const db = await getDb();
  const topics = await getAllTopics();
  let allSelectedQuestions: any[] = [];
  for (const topic of topics) {
    const questions = await db.select<any[]>(
      'SELECT * FROM questions WHERE topic_id = $1 ORDER BY RANDOM() LIMIT $2',
      [topic.id, questionsPerTopic]
    );
    for (const q of questions) {
      const rawOptions = await db.select<any[]>('SELECT * FROM options WHERE question_id = $1', [q.id]);
      q.options = await mapOptions(rawOptions);
      q.topicId = q.topic_id;
    }
    allSelectedQuestions = [...allSelectedQuestions, ...questions];
  }
  return allSelectedQuestions.sort(() => Math.random() - 0.5);
}

export async function savePdfTest(test: PdfTest) {
  const db = await getDb();
  try {
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
  } catch (error) {
    console.error('Failed to save PDF test:', error);
    throw error;
  }
}

export async function getAllPdfTests(): Promise<PdfTest[]> {
  const db = await getDb();
  const tests = await db.select<any[]>(`
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

  return tests.map(t => ({
    ...t,
    pdfPath: t.pdf_path,
    sourcePdfPath: t.source_pdf_path,
    topicId: t.topic_id,
    answers: [],
    lastAttempt: t.last_attempt_id ? {
      id: t.last_attempt_id,
      pdfTestId: t.id,
      score: t.last_score,
      totalQuestions: t.last_total_questions,
      durationSeconds: t.last_duration_seconds,
      attemptedAt: t.last_attempted_at
    } : null
  }));
}

export async function getPdfTestById(id: number): Promise<PdfTest | null> {
  const db = await getDb();
  const tests = await db.select<any[]>('SELECT * FROM pdf_tests WHERE id = $1', [id]);
  if (tests.length === 0) return null;
  const test = tests[0];
  const answers = await db.select<any[]>(
    'SELECT * FROM pdf_answers WHERE pdf_test_id = $1 ORDER BY question_number ASC',
    [id]
  );
  return {
    ...test,
    pdfPath: test.pdf_path,
    sourcePdfPath: test.source_pdf_path,
    topicId: test.topic_id,
    answers: answers.map(a => ({
      id: a.id,
      questionNumber: a.question_number,
      correctOption: a.correct_option
    }))
  };
}

export async function savePdfTestAttempt(attempt: Omit<PdfTestAttempt, 'id'>) {
  const db = await getDb();
  const result = await db.execute(
    'INSERT INTO pdf_test_attempts (pdf_test_id, score, total_questions, duration_seconds, attempted_at) VALUES ($1, $2, $3, $4, $5)',
    [attempt.pdfTestId, attempt.score, attempt.totalQuestions, attempt.durationSeconds, attempt.attemptedAt]
  );
  return result.lastInsertId;
}
