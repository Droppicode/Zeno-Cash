import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { configureGoogleAuth, uploadDatabaseToDrive, downloadLatestBackup, getBackupFilesList, downloadBackupById } from '../services/GoogleDriveBackup';
import { resetDatabase, seedDatabase } from '../database/seed';

export function useDataManagement() {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  
  const [googleTokens, setGoogleTokens] = useState(null);
  const [availableBackups, setAvailableBackups] = useState([]);
  const [isFetchingBackups, setIsFetchingBackups] = useState(false);
  const [isGoogleSignedIn, setIsGoogleSignedIn] = useState(false);

  useEffect(() => {
    configureGoogleAuth();
    checkGoogleLogin();
  }, []);

  const checkGoogleLogin = async () => {
    try {
      const signedIn = GoogleSignin.hasPreviousSignIn();
      setIsGoogleSignedIn(signedIn);
    } catch (e) {
      console.error(e);
    }
  };

  const forceGoogleLogin = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      await GoogleSignin.signIn();
      setIsGoogleSignedIn(true);
    } catch (error) {
      if (error.code !== statusCodes.SIGN_IN_CANCELLED && error.code !== statusCodes.IN_PROGRESS) {
        Alert.alert('Erro no Login', getFriendlyErrorMessage(error));
      }
    }
  };

  const getFriendlyErrorMessage = (error) => {
    const msg = error.message || String(error);
    if (msg.includes('Network request failed')) return 'Verifique sua conexão com a internet e tente novamente.';
    if (msg.includes('DEVELOPER_ERROR')) return 'Erro de configuração do Google (Falta de SHA-1 ou credenciais inválidas).';
    if (msg.includes('PLAY_SERVICES_NOT_AVAILABLE')) return 'Os serviços do Google Play não estão disponíveis no seu celular.';
    if (msg.includes('Insufficient Permission')) return 'Permissão negada pelo Google. Tente fazer o login novamente.';
    if (msg.includes('invalid_grant')) return 'Sua sessão expirou. Por favor, faça login novamente.';
    return msg;
  };

  const handleReset = () => {
    Alert.alert(
      'Resetar Aplicativo',
      'ATENÇÃO: Isso apagará todas as suas transações, dívidas, recorrências e contas salvas. Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir Tudo',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsResetting(true);
              await resetDatabase();
              Alert.alert('Sucesso', 'Aplicativo resetado com sucesso! Reinicie o app para recarregar.');
            } catch (err) {
              Alert.alert('Erro', 'Não foi possível resetar os dados.');
            } finally {
              setIsResetting(false);
            }
          }
        }
      ]
    );
  };

  const handleSeed = () => {
    Alert.alert(
      'Gerar Dados Mock (Seed)',
      'Isso irá resetar o banco e criar uma base completa de testes com bancos, assinaturas, parcelas e divisões.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Gerar Seed',
          onPress: async () => {
            try {
              setIsSeeding(true);
              await seedDatabase(true);
              Alert.alert('Sucesso', 'Base de dados gerada com sucesso! Reinicie o app para visualizar todas as novidades.');
            } catch (err) {
              Alert.alert('Erro', 'Não foi possível gerar a base de dados.');
            } finally {
              setIsSeeding(false);
            }
          }
        }
      ]
    );
  };

  const handleBackup = async () => {
    try {
      setIsBackingUp(true);
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      setIsGoogleSignedIn(true);
      const tokens = await GoogleSignin.getTokens();
      
      await uploadDatabaseToDrive(tokens.accessToken);
      Alert.alert('Sucesso', 'Backup realizado com sucesso no Google Drive!');
    } catch (error) {
      if (error.code !== statusCodes.SIGN_IN_CANCELLED && error.code !== statusCodes.IN_PROGRESS) {
        console.error(error);
        Alert.alert('Erro', 'Não foi possível realizar o backup:\n\n' + getFriendlyErrorMessage(error));
      }
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async () => {
    try {
      setIsFetchingBackups(true);
      await GoogleSignin.hasPlayServices();
      await GoogleSignin.signIn();
      const tokens = await GoogleSignin.getTokens();
      setGoogleTokens(tokens);
      
      const list = await getBackupFilesList(tokens.accessToken);
      if (list.length === 0) {
        Alert.alert('Nenhum Backup', 'Nenhum backup encontrado no Google Drive.');
      } else {
        setAvailableBackups(list);
      }
    } catch (error) {
      if (error.code !== statusCodes.SIGN_IN_CANCELLED && error.code !== statusCodes.IN_PROGRESS) {
        console.error(error);
        Alert.alert('Erro', 'Não foi possível buscar os backups:\n\n' + getFriendlyErrorMessage(error));
      }
    } finally {
      setIsFetchingBackups(false);
    }
  };

  const executeRestoreBackup = async (fileId) => {
    Alert.alert(
      'Restaurar Backup',
      'Isso irá substituir TODOS os seus dados atuais pelo backup selecionado. Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsRestoring(true);
              setAvailableBackups([]);
              if (fileId) {
                await downloadBackupById(googleTokens.accessToken, fileId);
              } else {
                await downloadLatestBackup(googleTokens.accessToken);
              }
              Alert.alert('Sucesso', 'Backup restaurado com sucesso! Reinicie o aplicativo para ver os dados.');
            } catch (error) {
              console.error(error);
              Alert.alert('Erro', 'Falha ao restaurar:\n\n' + getFriendlyErrorMessage(error));
            } finally {
              setIsRestoring(false);
            }
          }
        }
      ]
    );
  };

  return {
    isBackingUp,
    isRestoring,
    isResetting,
    isSeeding,
    handleReset,
    handleSeed,
    handleBackup,
    handleRestore,
    executeRestoreBackup,
    availableBackups,
    setAvailableBackups,
    isFetchingBackups,
    isGoogleSignedIn,
    forceGoogleLogin
  };
}
