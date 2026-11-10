import Svg, { Circle, Path, Rect } from 'react-native-svg';

type Props = {
  size?: number;
  /** Canopy colour, usually the subject's tint. */
  color?: string;
  /** A withered tree: bare branches and a grey stump. */
  withered?: boolean;
  /** 0..1 growth stage, used for the tree that is still growing. */
  growth?: number;
};

/** Hand-drawn SVG tree for the Focus Forest. */
export function Tree({ size = 32, color = '#2AA37B', withered = false, growth = 1 }: Props) {
  if (withered) {
    return (
      <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <Path
          d="M16 29V15M16 20L10 13M16 17L22.5 10.5M16 24.5L11 21"
          stroke="#B7BFBB"
          strokeWidth={2.2}
          strokeLinecap="round"
        />
        <Rect x={9} y={28.5} width={14} height={2.5} rx={1.25} fill="#DDE2E0" />
      </Svg>
    );
  }

  const stage = Math.min(1, Math.max(0, growth));
  const radius = 10 * (0.35 + 0.65 * stage);

  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Rect x={14.5} y={17} width={3} height={12} rx={1.5} fill="#8A6A4F" />
      <Circle cx={16} cy={12} r={radius} fill={color} />
      <Circle cx={11} cy={17} r={radius * 0.72} fill={color} opacity={0.9} />
      <Circle cx={21} cy={17} r={radius * 0.72} fill={color} opacity={0.9} />
    </Svg>
  );
}
