const fs = require('fs');
const { execSync, spawn } = require('child_process');
const path = require('path');

const appJsonPath = path.join(__dirname, 'app.json');
let appJson;

try {
  appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
} catch (err) {
  console.error("Error reading app.json. Make sure to run this script inside the 'app' directory.");
  process.exit(1);
}

// 1. Get the new version from the command argument (e.g., node build_local.js 1.1.0)
const newVersion = process.argv[2];
const oldVersion = appJson.expo.version;

if (newVersion) {
  appJson.expo.version = newVersion;
  console.log(`🚀 Updating version: ${oldVersion} -> ${newVersion}`);
} else {
  console.log(`ℹ️ No new version provided. Keeping current version: ${oldVersion}`);
  console.log(`Tip: To update the version, run: node build_local.js <new-version>`);
}

// 2. Increment versionCode
if (!appJson.expo.android) {
  appJson.expo.android = {};
}
let currentCode = appJson.expo.android.versionCode || 1;
currentCode += 1;
appJson.expo.android.versionCode = currentCode;

console.log(`📈 Incrementing versionCode to: ${currentCode}`);

// 3. Save the updated app.json
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');
console.log("✅ app.json saved successfully!\n");

// 4. Run expo prebuild to generate the android/ folder with the new data
console.log("⚙️ Running 'expo prebuild' (This might take a few seconds)...");
try {
  execSync('npx expo prebuild --platform android --clean', { 
    stdio: 'inherit', 
    env: { ...process.env, NODE_ENV: 'production', APP_ENV: 'production' } 
  });
  // NDK override permanently removed
  console.log("\n✅ android/ folder generated and updated successfully!\n");
} catch (err) {
  console.error("\n❌ Error running prebuild.");
  process.exit(1);
}

// 5. Try opening Android Studio
console.log("🤖 Trying to open Android Studio...");
try {
  // Using the exact absolute path found on your machine
  const studioProcess = spawn('/usr/local/android-studio/bin/studio.sh', ['./android'], { detached: true, stdio: 'ignore' });
  

  // Prevent Node from exiting with an error if the file fails
  studioProcess.on('error', (err) => {
    console.log("⚠️ Could not open Android Studio automatically.");
    console.log("👉 Please open Android Studio manually and select the 'android' folder generated here.");
  });

  studioProcess.unref();
  console.log("✅ Android Studio opening in the background!");
} catch (err) {
  console.log("⚠️ Could not open Android Studio automatically.");
}
