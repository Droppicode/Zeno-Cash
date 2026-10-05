# 📱 Zeno Cash

<p align="center">
  <img src="https://img.shields.io/badge/React_Native-20232A?style=flat&logo=react&logoColor=61DAFB" alt="React Native"/>
  <img src="https://img.shields.io/badge/Expo-000020?style=flat&logo=expo&logoColor=white" alt="Expo"/>
  <img src="https://img.shields.io/badge/SQLite-003B57?style=flat&logo=sqlite&logoColor=white" alt="SQLite"/>
  <img src="https://img.shields.io/badge/Drizzle_ORM-C5F74F?style=flat&logo=drizzle&logoColor=black" alt="Drizzle"/>
</p>

## ✨ Overview
**Zeno Cash** is a smart, offline-first personal finance tracking application built with React Native and Expo. 

It aims to make expense tracking frictionless by leveraging local databases and Android-specific features to automate financial logging.

### 🌐 Live Web Demo
Experience the app directly in your browser without installing anything! An in-memory database mock using `sql.js` (WebAssembly) allows seamless web exploration.

👉 **[Try Zeno Cash Web Demo](https://zeno-cash.vercel.app/)** *(PT-BR Only)*

### 🌟 Key Features
- **Automated Expense Tracking:** Uses Android Notification Listening (`react-native-android-notification-listener`) to read incoming bank notifications and automatically log expenses.
- **Credit Card Intelligence:** Automatically calculates invoice cycles, groups transactions by due dates, and manages roll-over balances mathematically.
- **Home Screen Widgets:** Quick access and overview of your finances right from your home screen using `react-native-android-widget`.
- **Local First & Fast:** Data is securely stored on your device using `expo-sqlite` and `drizzle-orm`, ensuring privacy and offline availability.
- **Web Demo Architecture:** Runs entirely in the browser using `sql.js`, and data persists across reloads via `localStorage`.
- **Beautiful Analytics:** Interactive and smooth financial charts built with `react-native-gifted-charts`.
- **Debts & Bill Splitting:** Split a transaction between people (with name suggestions) or log standalone debts. Marking a debt as paid creates a settlement transaction ("Acerto") on the right account or card invoice, and unmarking or deleting it reopens the debt. Home and the Debts screen always show the same pending totals, and a "show paid" filter lets you edit past debts.
- **Transaction Groups:** Organize transactions into many-to-many groups, either events (e.g. "Trip Alagoas 2026", with budget and dates) or ongoing (e.g. "Car Fiesta", with monthly and yearly averages). Each group has its own analysis screen, and you can bulk-assign transactions, set automatic rules (keywords, categories, account, amount, period) and compare groups side by side.
- **AI Assistant (Gemini / OpenAI / Claude):** Chat with your finances using function calling, so the model fetches only the data it needs instead of the whole database. It can answer questions, summarize months, read receipts from images or PDFs, and propose groups, rules, transactions, edits, deletions, debts, recurrences and settings changes. Every change is shown as a proposal card you must apply, and you choose in Settings → AI Assistant which areas it can touch. Replies render as Markdown and show tokens used and estimated cost.

## 🚀 Repository Structure
This repository contains two main projects:
1. `/` (Root): The main React Native / Expo application.
2. `/website`: The product landing page built with Vite + React.

Agent-friendly end-to-end test script for web and Android: `.agents/skills/zeno-cash-e2e-test/SKILL.md`.

## 💻 How to Run the App Locally

### Prerequisites
- Node.js installed
- Expo CLI or Expo Go app on your physical device

### Running locally
```bash
git clone https://github.com/Droppicode/Zeno-Cash.git
cd Zeno-Cash

# Install dependencies
npm install

# Start the Expo development server (Android/iOS)
npx expo start

# Start the Web App locally
npm run web
```
To use the AI Assistant, add your own API key in **Settings → AI Assistant**. The key is stored on your device (SecureStore on Android, `localStorage` on web) and requests go directly to the provider, with no backend in between.

Use the **Expo Go** app on your phone (scan the QR code) or an Android/iOS emulator to run the native project.
