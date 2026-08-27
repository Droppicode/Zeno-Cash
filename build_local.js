const fs = require('fs');
const { execSync, spawn } = require('child_process');
const path = require('path');

const appJsonPath = path.join(__dirname, 'app.json');
let appJson;

try {
  appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
} catch (err) {
  console.error("Erro ao ler app.json. Certifique-se de rodar este script dentro da pasta 'app'.");
  process.exit(1);
}

// 1. Pega a nova versão a partir do argumento do comando (ex: node build_local.js 1.1.0)
const newVersion = process.argv[2];
const oldVersion = appJson.expo.version;

if (newVersion) {
  appJson.expo.version = newVersion;
  console.log(`🚀 Atualizando versão: ${oldVersion} -> ${newVersion}`);
} else {
  console.log(`ℹ️ Nenhuma versão nova informada. Mantendo versão atual: ${oldVersion}`);
  console.log(`Dica: Para atualizar a versão, rode: node build_local.js <nova-versao>`);
}

// 2. Incrementa o versionCode
if (!appJson.expo.android) {
  appJson.expo.android = {};
}
let currentCode = appJson.expo.android.versionCode || 1;
currentCode += 1;
appJson.expo.android.versionCode = currentCode;

console.log(`📈 Incrementando versionCode para: ${currentCode}`);

// 3. Salva o app.json atualizado
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');
console.log("✅ app.json salvo com sucesso!\n");

// 4. Roda o expo prebuild para gerar a pasta android/ com os novos dados
console.log("⚙️ Rodando 'expo prebuild' (Isso pode levar alguns segundos)...");
try {
  execSync('npx expo prebuild --platform android --clean', { 
    stdio: 'inherit', 
    env: { ...process.env, NODE_ENV: 'production', APP_ENV: 'production' } 
  });
  // Override removido definitivamente
  console.log("\n✅ Pasta android/ gerada e atualizada com sucesso!\n");
} catch (err) {
  console.error("\n❌ Erro ao rodar o prebuild.");
  process.exit(1);
}

// 5. Tenta abrir o Android Studio
console.log("🤖 Tentando abrir o Android Studio...");
try {
  // Usando o caminho absoluto exato que encontramos na sua máquina
  const studioProcess = spawn('/usr/local/android-studio/bin/studio.sh', ['./android'], { detached: true, stdio: 'ignore' });
  

  // Impede que o Node feche com erro caso o arquivo ainda falhe
  studioProcess.on('error', (err) => {
    console.log("⚠️ Não consegui abrir o Android Studio automaticamente.");
    console.log("👉 Por favor, abra o Android Studio manualmente e selecione a pasta 'android' gerada aqui.");
  });

  studioProcess.unref();
  console.log("✅ Android Studio abrindo em segundo plano!");
} catch (err) {
  console.log("⚠️ Não consegui abrir o Android Studio automaticamente.");
}
