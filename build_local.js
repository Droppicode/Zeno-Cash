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

console.log("📦 Committing version bump to prevent prebuild warnings...");
try {
  execSync('git add app.json && git commit -m "chore: bump version code for new build"', { stdio: 'inherit' });
} catch (e) {
  console.log("⚠️ Could not commit (maybe there are no changes or git is not configured).\n");
}

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

// 5. Compile the Release APK using Gradle
console.log("🔨 Compiling the Release APK with Gradle...");
try {
  // Configurar o Android SDK (porque o prebuild --clean apaga o local.properties)
  const localPropertiesPath = path.join(__dirname, 'android', 'local.properties');
  fs.writeFileSync(localPropertiesPath, 'sdk.dir=/home/marcos/Android/Sdk\n');

  execSync('./gradlew assembleRelease', { 
    cwd: path.join(__dirname, 'android'),
    stdio: 'inherit'
  });
  console.log("\n✅ APK compiled successfully!");
  console.log("👉 You can find your independent APK here:");
  console.log(path.join(__dirname, 'android/app/build/outputs/apk/release/app-release.apk') + "\n");
} catch (err) {
  console.error("\n❌ Error compiling the APK with Gradle.");
  console.error("Please check the logs above for details.");
  process.exit(1);
}
