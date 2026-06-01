#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(
                    "sqlite:tnpsc.db",
                    vec![
                        tauri_plugin_sql::Migration {
                            version: 1,
                            description: "create initial tables",
                            sql: "
                            CREATE TABLE IF NOT EXISTS questions (
                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                text TEXT,
                                image_path TEXT,
                                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                            );
                            CREATE TABLE IF NOT EXISTS options (
                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                question_id INTEGER,
                                text TEXT,
                                is_correct BOOLEAN,
                                FOREIGN KEY(question_id) REFERENCES questions(id)
                            );
                        ",
                            kind: tauri_plugin_sql::MigrationKind::Up,
                        },
                        tauri_plugin_sql::Migration {
                            version: 2,
                            description: "add topics support",
                            sql: "
                            CREATE TABLE IF NOT EXISTS topics (
                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                name TEXT UNIQUE NOT NULL,
                                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                            );
                            ALTER TABLE questions ADD COLUMN topic_id INTEGER REFERENCES topics(id);
                        ",
                            kind: tauri_plugin_sql::MigrationKind::Up,
                        },
                        tauri_plugin_sql::Migration {
                            version: 3,
                            description: "add pdf tests support",
                            sql: "
                            CREATE TABLE IF NOT EXISTS pdf_tests (
                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                name TEXT NOT NULL,
                                pdf_path TEXT NOT NULL,
                                topic_id INTEGER REFERENCES topics(id),
                                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                            );
                            CREATE TABLE IF NOT EXISTS pdf_answers (
                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                pdf_test_id INTEGER REFERENCES pdf_tests(id),
                                question_number INTEGER NOT NULL,
                                correct_option TEXT NOT NULL,
                                FOREIGN KEY(pdf_test_id) REFERENCES pdf_tests(id)
                            );
                        ",
                            kind: tauri_plugin_sql::MigrationKind::Up,
                        },
                        tauri_plugin_sql::Migration {
                            version: 4,
                            description: "store source pdf path for pdf.js rendering",
                            sql: "
                            ALTER TABLE pdf_tests ADD COLUMN source_pdf_path TEXT;
                        ",
                            kind: tauri_plugin_sql::MigrationKind::Up,
                        },
                        tauri_plugin_sql::Migration {
                            version: 5,
                            description: "store pdf test attempt history",
                            sql: "
                            CREATE TABLE IF NOT EXISTS pdf_test_attempts (
                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                pdf_test_id INTEGER NOT NULL REFERENCES pdf_tests(id),
                                score INTEGER NOT NULL,
                                total_questions INTEGER NOT NULL,
                                duration_seconds INTEGER NOT NULL,
                                attempted_at TEXT NOT NULL
                            );
                        ",
                            kind: tauri_plugin_sql::MigrationKind::Up,
                        },
                        tauri_plugin_sql::Migration {
                            version: 6,
                            description: "add pdf materials",
                            sql: "
                            CREATE TABLE IF NOT EXISTS pdf_materials (
                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                name TEXT NOT NULL,
                                pdf_path TEXT NOT NULL,
                                source_pdf_path TEXT,
                                topic_id INTEGER REFERENCES topics(id),
                                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                            );
                        ",
                            kind: tauri_plugin_sql::MigrationKind::Up,
                        },
                        tauri_plugin_sql::Migration {
                            version: 7,
                            description: "add last_opened_at to pdf_materials",
                            sql: "
                            ALTER TABLE pdf_materials ADD COLUMN last_opened_at DATETIME;
                        ",
                            kind: tauri_plugin_sql::MigrationKind::Up,
                        },
                        tauri_plugin_sql::Migration {
                            version: 8,
                            description: "add total_study_seconds to pdf_materials",
                            sql: "
                            ALTER TABLE pdf_materials ADD COLUMN total_study_seconds INTEGER NOT NULL DEFAULT 0;
                        ",
                            kind: tauri_plugin_sql::MigrationKind::Up,
                        },
                        tauri_plugin_sql::Migration {
                            version: 9,
                            description: "add text tests support",
                            sql: "
                            CREATE TABLE IF NOT EXISTS text_tests (
                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                name TEXT NOT NULL,
                                topic_id INTEGER REFERENCES topics(id),
                                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                            );
                            ALTER TABLE questions ADD COLUMN text_test_id INTEGER REFERENCES text_tests(id);
                            CREATE TABLE IF NOT EXISTS text_test_attempts (
                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                text_test_id INTEGER NOT NULL REFERENCES text_tests(id),
                                score INTEGER NOT NULL,
                                total_questions INTEGER NOT NULL,
                                duration_seconds INTEGER NOT NULL,
                                attempted_at TEXT NOT NULL
                            );
                        ",
                            kind: tauri_plugin_sql::MigrationKind::Up,
                        },
                    ],
                )
                .build(),
        )
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
