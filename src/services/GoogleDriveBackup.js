import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { File, Paths } from 'expo-file-system';
import { expoDb } from '../database/db';

export const configureGoogleAuth = () => {
  try {
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_WEB_CLIENT_ID,
      scopes: ['https://www.googleapis.com/auth/drive.file'],
      offlineAccess: true,
    });
  } catch (e) {
    console.error("Google Auth Configure Error:", e);
  }
};

const getFolderId = async (token, folderName) => {
  const query = encodeURIComponent(`mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`);
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&spaces=drive`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data?.error?.message || "Erro ao buscar pasta no Drive");
  
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  return null;
};

const createFolder = async (token, folderName) => {
  const metadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder'
  };
  const response = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(metadata)
  });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data?.error?.message || "Erro ao criar pasta no Drive");
  return data.id;
};

export const createOrGetBackupFolder = async (token) => {
  const folderName = 'Zeno Cash Backup';
  let folderId = await getFolderId(token, folderName);
  if (!folderId) {
    folderId = await createFolder(token, folderName);
  }
  return folderId;
};

export const enforceBackupLimit = async (token, folderId) => {
  try {
    const limitQuery = expoDb.getFirstSync("SELECT value FROM settings WHERE key = 'backupLimit'");
    const limit = limitQuery && !isNaN(parseInt(limitQuery.value, 10)) ? parseInt(limitQuery.value, 10) : 5;

    const query = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
    const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=createdTime desc`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    
    if (data.files && data.files.length > limit) {
      const filesToDelete = data.files.slice(limit);
      for (const file of filesToDelete) {
        await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    }
  } catch (error) {
    console.error("Error enforcing backup limit:", error);
  }
};

export const uploadDatabaseToDrive = async (token) => {
  try {
    const folderId = await createOrGetBackupFolder(token);
    const dbFile = new File(Paths.document, 'SQLite', 'zenocash.db');
    
    if (!dbFile.exists) throw new Error("Database file not found");

    const date = new Date();
    const formattedDate = date.getFullYear() + '-' +
      String(date.getMonth() + 1).padStart(2, '0') + '-' +
      String(date.getDate()).padStart(2, '0') + '_' +
      String(date.getHours()).padStart(2, '0') + '-' +
      String(date.getMinutes()).padStart(2, '0') + '-' +
      String(date.getSeconds()).padStart(2, '0');

    const fileName = `zenocash_backup_${formattedDate}.db`;
    const fileContentBase64 = await dbFile.base64();
    
    const boundary = 'foo_bar_baz';
    const metadata = {
      name: fileName,
      parents: [folderId]
    };

    let body = `--${boundary}\r\n`;
    body += `Content-Type: application/json; charset=UTF-8\r\n\r\n`;
    body += `${JSON.stringify(metadata)}\r\n`;
    body += `--${boundary}\r\n`;
    body += `Content-Type: application/octet-stream\r\n`;
    body += `Content-Transfer-Encoding: base64\r\n\r\n`;
    body += `${fileContentBase64}\r\n`;
    body += `--${boundary}--`;

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: body
    });

    const result = await response.json();
    if (result.error) throw new Error(result.error.message);
    
    await enforceBackupLimit(token, folderId);
    
    return true;
  } catch (error) {
    console.error("Backup upload error:", error);
    throw error;
  }
};

export const downloadLatestBackup = async (token) => {
    const folderId = await getFolderId(token, 'Zeno Cash Backup');
    if (!folderId) throw new Error("Pasta de backup não encontrada.");

    const query = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
    const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=createdTime desc`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    
    if (!data.files || data.files.length === 0) {
        throw new Error("Nenhum backup encontrado no Google Drive.");
    }
    
    const latestFile = data.files[0];
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${latestFile.id}?alt=media`;
    
    // Close existing connection if any before replacing the file
    try {
        const destinationFile = new File(Paths.document, 'SQLite', 'zenocash.db');
        if (destinationFile.exists) {
            destinationFile.delete();
        }
        await File.downloadFileAsync(downloadUrl, destinationFile, {
          headers: { Authorization: `Bearer ${token}` }
        });
        return true;
    } catch (e) {
        console.error("Download failed:", e);
        throw e;
    }
};

export const performSilentDailyBackup = async () => {
    try {
        const freqQuery = expoDb.getFirstSync("SELECT value FROM settings WHERE key = 'backupFrequency'");
        const freq = freqQuery ? freqQuery.value : 'daily';

        const todayDate = new Date();
        const today = todayDate.toISOString().split('T')[0];
        
        const lastBackupQuery = expoDb.getFirstSync("SELECT value FROM settings WHERE key = 'last_daily_backup'");
        const lastBackupDateStr = lastBackupQuery ? lastBackupQuery.value : null;

        if (lastBackupDateStr) {
            if (freq === 'daily' && lastBackupDateStr === today) return;
            
            const lastDate = new Date(lastBackupDateStr);
            const diffTime = Math.abs(todayDate - lastDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (freq === 'weekly' && diffDays < 7) return;
            if (freq === 'monthly' && diffDays < 30) return;
        }

        const hasPlayServices = await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: false });
        if (!hasPlayServices) return;

        const isSignedIn = GoogleSignin.hasPreviousSignIn();
        if (!isSignedIn) return;

        configureGoogleAuth();
        await GoogleSignin.signInSilently();
        const tokens = await GoogleSignin.getTokens();
        
        await uploadDatabaseToDrive(tokens.accessToken);
        
        expoDb.execSync(`INSERT INTO settings (key, value) VALUES ('last_daily_backup', '${today}') ON CONFLICT(key) DO UPDATE SET value = '${today}'`);
        
    } catch (error) {
        console.warn("Backup silencioso falhou:", error);
    }
};
