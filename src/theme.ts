/**
 * Design tokens for the Student App UI.
 * Palette + type scale follow the Figma reference: mint gradients,
 * near-black cards, soft rounded corners and Poppins typography.
 */

export const colors = {
  // base
  bg: '#FFFFFF',
  surface: '#F5F9F7',
  line: '#EDF2EF',
  ink: '#0E1A15',
  inkSoft: '#16211C',
  body: '#5F6F69',
  muted: '#97A5A0',
  white: '#FFFFFF',

  // brand mint
  mint: '#6ED9B4',
  mintDeep: '#2FBF92',
  mintDark: '#1E9C75',
  mintSoft: '#E6F8F1',
  mintMist: '#F2FCF8',

  // accents
  danger: '#F0796B',
  warm: '#F4C471',
  lilac: '#B9A6F5',
  sky: '#8AC4F5',
  peach: '#F5A97F',
};

export const gradients = {
  mint: ['#B4F2DF', '#5ED6B0'] as const,
  mintDeep: ['#9EEED5', '#45CBA3'] as const,
  dark: ['#16241E', '#0B1410'] as const,
  focus: ['#8FE8C9', '#35C79B'] as const,
};

export const fonts = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
  extra: 'Poppins_800ExtraBold',
};

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
};

export const shadow = {
  card: {
    shadowColor: '#0E1A15',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  float: {
    shadowColor: '#0E1A15',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
} as const;

export const subjectTints = {
  bio: { bg: '#DDF6EC', fg: '#2AA37B' },
  chem: { bg: '#E4EEFF', fg: '#4B7BDB' },
  phys: { bg: '#FDF2D8', fg: '#B58A23' },
  agri: { bg: '#F0E7FC', fg: '#8657D6' },
  writing: { bg: '#FDEAE0', fg: '#C36C3C' },
} as const;

/**
 * Tint pairs used by the Toolbox hub cards (icon tile background + foreground).
 * Kept separate from `subjectTints` so subject colours stay stable.
 */
export const toolAccents = {
  mint: { bg: '#E6F8F1', fg: '#1E9C75' },
  sky: { bg: '#E7F2FD', fg: '#3B82C4' },
  lilac: { bg: '#F0EAFD', fg: '#7C5FD3' },
  warm: { bg: '#FDF4E1', fg: '#A87A16' },
  peach: { bg: '#FDEDE4', fg: '#C36C3C' },
  rose: { bg: '#FDECEF', fg: '#C24D63' },
} as const;

export type ToolAccent = keyof typeof toolAccents;

/** Neutral tokens for paper / print previews. */
export const paper = {
  sheet: '#FFFFFF',
  edge: '#E6ECE8',
  guide: '#8FE8C9',
  cut: '#B9C4BF',
  ink: '#0E1A15',
  softInk: '#5F6F69',
} as const;
