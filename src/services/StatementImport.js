import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import { decodeText, parseStatement } from '../utils/StatementParser';

const readBytes = async (uri) => {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    return new Uint8Array(await response.arrayBuffer());
  }
  return new File(uri).bytes();
};

export const pickStatement = async () => {
  const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  if (result.canceled || !result.assets || result.assets.length === 0) return null;
  const file = result.assets[0];
  const text = decodeText(await readBytes(file.uri));
  return { fileName: file.name, ...parseStatement(text) };
};
