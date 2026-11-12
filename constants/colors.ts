const shared = {
  primary: '#147D69', primaryDim: '#E6F2EC', secondary: '#B77729', secondaryDim: '#FCF2DF',
  success: '#237A53', successDim: '#E8F3EB', danger: '#BF4B46', dangerDim: '#FBECE9',
  warning: '#A56B21', warningDim: '#FBF1DB', purple: '#7962AC', purpleDim: '#F0ECF8',
  blue: '#4C7EA7', blueDim: '#EAF1F8', tint: '#147D69', tabIconDefault: '#84908E', tabIconSelected: '#147D69',
  cardGradientStart: '#E2F0E5', cardGradientEnd: '#F0F5E8',
};
export const lightColors = { ...shared, background: '#F6F8F7', surface: '#FFFFFF', surfaceElevated: '#F0F4F1', border: '#E3E9E5', text: '#20382F', textSecondary: '#6A7A72', textTertiary: '#7D8C84', sidebar: '#FFFFFF', hero: '#E4F0E4', heroText: '#264D3A', chartGrid: '#E8EDE9', shadow: '#244B36' };
export const darkColors: typeof lightColors = { ...shared, background: '#111C19', surface: '#192823', surfaceElevated: '#22352D', border: '#2C4036', text: '#EDF4EE', textSecondary: '#A4B6AA', textTertiary: '#8FA296', sidebar: '#15231E', hero: '#254638', heroText: '#E0F0D9', primary: '#8DCCB0', primaryDim: '#254336', success: '#9BD0AB', successDim: '#263F30', danger: '#EEA29A', dangerDim: '#462E2A', warning: '#E6BF7A', warningDim: '#423B27', blue: '#9ABEDD', blueDim: '#263946', purple: '#C0ADE0', purpleDim: '#373044', tint: '#8DCCB0', tabIconSelected: '#8DCCB0', chartGrid: '#304438', shadow: '#000000', cardGradientStart: '#254638', cardGradientEnd: '#1C3328' };
export type ThemeColors = typeof lightColors;
const Colors = { light: lightColors, dark: darkColors };
export default Colors;
