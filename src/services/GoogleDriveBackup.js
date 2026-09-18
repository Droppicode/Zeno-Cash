import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { File, Paths } from 'expo-file-system';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import { NativeModules } from 'react-native';
import { expoDb } from '../database/db';
import { DataExportService } from './DataExportService';

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

const getFolderId = async (token, folderName, parentFolderId = null) => {
  let queryStr = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`;
  if (parentFolderId) {
    queryStr += ` and '${parentFolderId}' in parents`;
  }
  const query = encodeURIComponent(queryStr);
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

const createFolder = async (token, folderName, parentFolderId = null) => {
  const metadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder'
  };
  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }
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

export const createOrGetBackupFolder = async (token, createIfMissing = true) => {
  const rootFolderName = 'Zeno Cash Backup';
  let rootFolderId = await getFolderId(token, rootFolderName);
  if (!rootFolderId) {
    if (!createIfMissing) return null;
    rootFolderId = await createFolder(token, rootFolderName);
  }
  
  if (__DEV__) {
    let devFolderId = await getFolderId(token, 'dev', rootFolderId);
    if (!devFolderId) {
      if (!createIfMissing) return null;
      devFolderId = await createFolder(token, 'dev', rootFolderId);
    }
    return devFolderId;
  }
  
  return rootFolderId;
};

export const enforceBackupLimit = async (token, folderId) => {
  try {
    const limitQuery = expoDb.getFirstSync("SELECT value FROM settings WHERE key = 'backupLimit'");
    const limit = limitQuery && !isNaN(parseInt(limitQuery.value, 10)) ? parseInt(limitQuery.value, 10) : 5;

    const query = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
    const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=createdTime desc&fields=files(id,name,createdTime)`, {
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
    await expoDb.execAsync('PRAGMA wal_checkpoint(TRUNCATE);');
    
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
    
    // 1. Upload media content directly using uploadAsync to avoid base64 memory limit
    const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=media';
    const uploadResult = await LegacyFileSystem.uploadAsync(uploadUrl, dbFile.uri, {
      httpMethod: 'POST',
      uploadType: LegacyFileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
      },
    });

    if (uploadResult.status !== 200) {
      throw new Error("Falha no upload binário para o Drive.");
    }
    
    const result = JSON.parse(uploadResult.body);
    const fileId = result.id;

    // 2. Patch metadata (name and parent folder)
    const patchResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${folderId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: fileName
      })
    });

    if (!patchResponse.ok) {
      const errorData = await patchResponse.text();
      console.error("Falha ao atualizar metadados do backup:", errorData);
      throw new Error(`Falha ao atualizar metadados do backup. Detalhes: ${errorData}`);
    }
    
    await enforceBackupLimit(token, folderId);
    
    return true;
  } catch (error) {
    console.error("Backup upload error:", error);
    throw error;
  }
};

export const getBackupFilesList = async (token) => {
    const folderId = await createOrGetBackupFolder(token, false);
    if (!folderId) return [];

    const query = encodeURIComponent(`'${folderId}' in parents and name contains 'zenocash_backup_' and trashed=false`);
    const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=createdTime desc&fields=files(id,name,createdTime)`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    return data.files || [];
};

export const downloadBackupById = async (token, fileId) => {
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    
    try { await expoDb.closeAsync(); } catch (e) {}

    const destinationFile = new File(Paths.document, 'SQLite', 'zenocash.db');
    if (destinationFile.exists) {
        await destinationFile.delete();
    }
    
    await File.downloadFileAsync(downloadUrl, destinationFile, {
      headers: { Authorization: `Bearer ${token}` }
    });

    try {
      const walFile = new File(Paths.document, 'SQLite', 'zenocash.db-wal');
      if (walFile.exists) await walFile.delete();
      const shmFile = new File(Paths.document, 'SQLite', 'zenocash.db-shm');
      if (shmFile.exists) await shmFile.delete();
    } catch(e) {}
    
    if (__DEV__ && NativeModules.DevSettings) {
      NativeModules.DevSettings.reload();
    }
    return true;
};

export const downloadLatestBackup = async (token) => {
    const folderId = await createOrGetBackupFolder(token, false);
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
    
    try { await expoDb.closeAsync(); } catch (e) {}

    const destinationFile = new File(Paths.document, 'SQLite', 'zenocash.db');
    if (destinationFile.exists) {
        await destinationFile.delete();
    }
    
    await File.downloadFileAsync(downloadUrl, destinationFile, {
      headers: { Authorization: `Bearer ${token}` }
    });

    try {
      const walFile = new File(Paths.document, 'SQLite', 'zenocash.db-wal');
      if (walFile.exists) await walFile.delete();
      const shmFile = new File(Paths.document, 'SQLite', 'zenocash.db-shm');
      if (shmFile.exists) await shmFile.delete();
    } catch(e) {}
    
    if (__DEV__ && NativeModules.DevSettings) {
      NativeModules.DevSettings.reload();
    }
    return true;
};

export const performSilentDailyBackup = async () => {
    try {
        const enabledQuery = expoDb.getFirstSync("SELECT value FROM settings WHERE key = 'autoBackupEnabled'");
        if (!enabledQuery || enabledQuery.value !== 'true') return;

        const destQuery = expoDb.getFirstSync("SELECT value FROM settings WHERE key = 'autoBackupDestination'");
        const destination = destQuery ? destQuery.value : 'drive';

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

        if (destination === 'local') {
            await DataExportService.createSilentLocalBackup();
        } else {
            const hasPlayServices = await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: false });
            if (!hasPlayServices) return;

            const isSignedIn = GoogleSignin.hasPreviousSignIn();
            if (!isSignedIn) return;

            configureGoogleAuth();
            await GoogleSignin.signInSilently();
            const tokens = await GoogleSignin.getTokens();
            
            await uploadDatabaseToDrive(tokens.accessToken);
        }
        
        expoDb.execSync(`INSERT INTO settings (key, value) VALUES ('last_daily_backup', '${today}') ON CONFLICT(key) DO UPDATE SET value = '${today}'`);
        
    } catch (error) {
        console.warn("Backup silencioso falhou:", error);
    }
};
