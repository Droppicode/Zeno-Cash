import { Dimensions, Platform } from 'react-native';

const { width: windowWidth } = Dimensions.get('window');
// Na web, como forçamos um frame de celular de 390px, devemos usar no máximo 390
const width = Platform.OS === 'web' ? Math.min(windowWidth, 390) : windowWidth;

// A base design width of 450.
// If the screen width is exactly 360, this will give a factor of 0.8 (360/450)
// matching the original manual "0.8" magic number, but now it scales perfectly.
const BASE_WIDTH = 500;
const responsiveScale = width / BASE_WIDTH;

export const getZoomFactor = (theme) => {
  const userZoom = theme?.zoom || 1;
  return responsiveScale * userZoom;
};
