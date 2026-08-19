import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { Alert } from 'react-native';

export class DocumentScanner {
  static async pickDocument() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const file = result.assets[0];
      const fsFile = new File(file.uri);
      const base64 = await fsFile.base64();

      return {
        uri: file.uri,
        mimeType: file.mimeType || 'application/pdf',
        base64: base64,
        name: file.name
      };
    } catch (err) {
      console.error('Error picking document', err);
      Alert.alert('Erro', 'Não foi possível ler o documento.');
      return null;
    }
  }

  static async pickImage() {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permissão Negada', 'O app precisa da câmera para escanear a nota fiscal.');
        return null;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: true
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const file = result.assets[0];
      return {
        uri: file.uri,
        mimeType: 'image/jpeg',
        base64: file.base64,
        name: 'camera_capture.jpg'
      };
    } catch (err) {
      console.error('Error taking photo', err);
      Alert.alert('Erro', 'Não foi possível tirar a foto.');
      return null;
    }
  }
}
