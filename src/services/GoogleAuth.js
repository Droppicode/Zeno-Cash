import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import * as SecureStore from 'expo-secure-store';

export const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_WEB_CLIENT_ID;
export const ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_ANDROID_CLIENT_ID;

// Configure exactly once
GoogleSignin.configure({
  scopes: [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/drive.appdata'
  ],
  webClientId: WEB_CLIENT_ID,
  offlineAccess: true, // Requires true to get a refresh token
});

export const GoogleAuth = {
  signIn: async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const tokens = await GoogleSignin.getTokens();
      
      // Save tokens securely
      if (tokens.accessToken) {
        await SecureStore.setItemAsync('google_access_token', tokens.accessToken);
      }
      return { success: true, user: userInfo.user };
    } catch (error) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('User cancelled the login flow');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        console.log('Sign in is in progress already');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        console.error('Play services not available or outdated');
      } else {
        console.error('GoogleAuth.signIn error', error);
      }
      return { success: false, error };
    }
  },

  signOut: async () => {
    try {
      await GoogleSignin.signOut();
      await SecureStore.deleteItemAsync('google_access_token');
      return true;
    } catch (error) {
      console.error('GoogleAuth.signOut error', error);
      return false;
    }
  },

  getTokens: async () => {
    try {
      const accessToken = await SecureStore.getItemAsync('google_access_token');
      // google-signin manages refresh tokens natively, so calling getTokens() will refresh automatically if expired.
      const currentTokens = await GoogleSignin.getTokens();
      return currentTokens.accessToken;
    } catch (error) {
      return null;
    }
  },

  getCurrentUser: async () => {
    try {
      const userInfo = await GoogleSignin.getCurrentUser();
      return userInfo ? userInfo.user : null;
    } catch (error) {
      return null;
    }
  }
};
