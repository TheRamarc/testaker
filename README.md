# TNPSC MASTER 📚

**TNPSC MASTER** is a specialized desktop application designed for candidates preparing for competitive exams, specifically the Tamil Nadu Public Service Commission (TNPSC) exams. It transforms static PDF question papers into interactive, trackable practice tests.

> **Note**: This is an experimental platform built for efficiency and high-performance exam preparation.

---

## ✨ Features

- **Interactive PDF Testing**: Take tests while viewing the original question paper PDF.
- **Test Builder**: Easily register new PDF question papers and set up answer keys.
- **Topic Management**: Categorize tests by topics for better organization.
- **Exam Simulation**: Live OMR-style answer sheet with real-time score calculation.
- **Performance Tracking**: Track the time taken and scores for every attempt.
- **Privacy First**: All your data, PDFs, and progress are stored locally on your machine.

---

## 🚀 Getting Started (Users)

### Prerequisites
To use TNPSC MASTER, you simply need to download the latest release for your operating system (Windows/macOS/Linux).

### How to use:
1.  **Setup a Test**:
    - Go to the **"Setup PDF Test"** tab.
    - Pick a PDF question paper from your computer.
    - Select or create a **Topic**.
    - Enter the number of questions.
    - Provide the **Answer Key** (A, B, C, D).
    - Save the test.
2.  **Take a Test**:
    - Switch to the **"Live PDF Test"** tab.
    - Select a registered test from the list.
    - Click **"Start Test"**.
    - Use the OMR sheet on the right to mark your answers while scrolling through the PDF.
    - Click **"Finish Test"** to see your score and time taken.

---

## 🛠 Development (Contributors)

Thank you for considering contributing to TNPSC MASTER!

### Tech Stack
- **Framework**: [Tauri v2](https://tauri.app/) (Rust + React)
- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Database**: SQLite (via `tauri-plugin-sql`)
- **PDF Engine**: PDF.js

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- [pnpm](https://pnpm.io/installation) (recommended)

### Local Setup
1.  **Clone the repository**:
    ```bash
    git clone https://github.com/TheRamarc/testaker.git
    cd testaker
    ```
2.  **Install dependencies**:
    ```bash
    pnpm install
    ```
3.  **Run in development mode**:
    ```bash
    pnpm tauri dev
    ```
4.  **Build the application**:
    ```bash
    pnpm tauri build
    ```

### Project Structure
- `src/`: React frontend application.
  - `components/`: Core UI components (`PdfTestBuilder`, `PdfTestMode`).
  - `lib/`: Database and storage utilities.
- `src-tauri/`: Rust backend and Tauri configuration.
  - `src/`: Rust source code.
  - `capabilities/`: Security permissions.
- `pdf/`: Local storage for uploaded PDFs.

---

## 🤝 Contributing

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

