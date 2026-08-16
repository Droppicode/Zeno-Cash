import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

// A base design width of 450.
// If the screen width is exactly 360, this will give a factor of 0.8 (360/450)
// matching the original manual "0.8" magic number, but now it scales perfectly.
const BASE_WIDTH = 500;
const responsiveScale = width / BASE_WIDTH;

export const getZoomFactor = (theme) => {
  const userZoom = theme?.zoom || 1;
  return responsiveScale * userZoom;
};
