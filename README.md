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

### 🌟 Key Features
- **Automated Expense Tracking:** Uses Android Notification Listening (`react-native-android-notification-listener`) to read incoming bank notifications and automatically log expenses.
- **Home Screen Widgets:** Quick access and overview of your finances right from your home screen using `react-native-android-widget`.
- **Local First & Fast:** Data is securely stored on your device using `expo-sqlite` and `drizzle-orm`, ensuring privacy and offline availability.
- **Beautiful Analytics:** Interactive and smooth financial charts built with `react-native-gifted-charts`.
- **Cloud Backup:** Optional Google Sign-In integration for seamless data syncing.

## 📸 Screenshots
*(Add 2-3 screenshots or a GIF of your app running here to impress recruiters!)*

## 🚀 How to Run

### Prerequisites
- Node.js installed
- Expo CLI or Expo Go app on your physical device

### Running locally
```bash
git clone https://github.com/your-username/zeno-cash.git
cd zeno-cash/app

# Install dependencies
npm install

# Start the Expo development server
npm start
```
Use the **Expo Go** app on your phone (scan the QR code) or an Android/iOS emulator to run the project.
