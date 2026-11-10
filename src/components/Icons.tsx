import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type IconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

const defaults = { size: 22, color: '#0E1A15', strokeWidth: 1.8 };

export function HomeIcon({
  size = defaults.size,
  color = defaults.color,
  strokeWidth = defaults.strokeWidth,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 10.6 12 3.6l8 7v8.8a1.6 1.6 0 0 1-1.6 1.6h-3.9v-6.2H9.5V21H5.6A1.6 1.6 0 0 1 4 19.4v-8.8Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function BookIcon({
  size = defaults.size,
  color = defaults.color,
  strokeWidth = defaults.strokeWidth,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 6.9C10.3 5.6 8 4.9 5 4.9v12.2c3 0 5.3.7 7 2 1.7-1.3 4-2 7-2V4.9c-3 0-5.3.7-7 2Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M12 6.9v12.2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function StarIcon({
  size = defaults.size,
  color = defaults.color,
  strokeWidth = defaults.strokeWidth,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3.7l2.46 5 5.5.79-3.98 3.87.94 5.48L12 16.25l-4.92 2.59.94-5.48L4.04 9.49l5.5-.79L12 3.7Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function GridIcon({
  size = defaults.size,
  color = defaults.color,
  strokeWidth = defaults.strokeWidth,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={4} y={4} width={6.4} height={6.4} rx={2} stroke={color} strokeWidth={strokeWidth} />
      <Rect x={13.6} y={4} width={6.4} height={6.4} rx={2} stroke={color} strokeWidth={strokeWidth} />
      <Rect x={4} y={13.6} width={6.4} height={6.4} rx={2} stroke={color} strokeWidth={strokeWidth} />
      <Rect x={13.6} y={13.6} width={6.4} height={6.4} rx={2} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function ClockIcon({
  size = 18,
  color = defaults.color,
  strokeWidth = defaults.strokeWidth,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={8.2} stroke={color} strokeWidth={strokeWidth} />
      <Path
        d="M12 7.7V12l3 1.8"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function FlameIcon({
  size = 18,
  color = defaults.color,
  strokeWidth = defaults.strokeWidth,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 20.7c3.2 0 5.7-2.4 5.7-5.5 0-3.2-2.3-4.8-3.7-7.2-.5-.9-.9-1.9-1-3.1-1.9.9-3.2 2.8-3.2 4.8 0 .8.2 1.5.5 2.1-1.3-.4-2.5-1.5-2.9-3.1-.8 1.2-1.1 2.7-1.1 4.3 0 4 2.5 7.7 5.7 7.7Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ChevronRightIcon({
  size = 18,
  color = defaults.color,
  strokeWidth = 2,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9.5 5.5 16 12l-6.5 6.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ChevronDownIcon({
  size = 18,
  color = defaults.color,
  strokeWidth = 2,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5.5 9.5 12 16l6.5-6.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function PlayIcon({ size = 20, color = '#FFFFFF' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8.6 5.7v12.6c0 .5.6.8 1 .5l9.3-6.3c.4-.3.4-.9 0-1.2L9.6 5.2c-.4-.3-1 0-1 .5Z"
        fill={color}
      />
    </Svg>
  );
}

export function PauseIcon({ size = 20, color = '#FFFFFF' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={8.2} y={5.6} width={2.7} height={12.8} rx={1.35} fill={color} />
      <Rect x={13.1} y={5.6} width={2.7} height={12.8} rx={1.35} fill={color} />
    </Svg>
  );
}

export function CheckIcon({
  size = 18,
  color = defaults.color,
  strokeWidth = 2.2,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12.6l4.4 4.4L19 7.4"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function SparkleIcon({
  size = 18,
  color = defaults.color,
  strokeWidth = 1.6,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9L12 3.5Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function VideoIcon({
  size = 18,
  color = defaults.color,
  strokeWidth = defaults.strokeWidth,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x={3.4}
        y={5.6}
        width={17.2}
        height={12.8}
        rx={3.2}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Path d="M10.4 9.6l4.4 2.4-4.4 2.4V9.6Z" fill={color} />
    </Svg>
  );
}

export function ArrowUpRightIcon({
  size = 16,
  color = defaults.color,
  strokeWidth = 2,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 17 17 7M9.2 7H17v7.8"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/* ---------------------------------------------------------------- */
/* Toolbox icons                                                     */
/* ---------------------------------------------------------------- */

export function ChevronLeftIcon({
  size = 18,
  color = defaults.color,
  strokeWidth = 2,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14.5 5.5 8 12l6.5 6.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ToolsIcon({
  size = defaults.size,
  color = defaults.color,
  strokeWidth = defaults.strokeWidth,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3.8 9.4h16.4v8.9a2 2 0 0 1-2 2H5.8a2 2 0 0 1-2-2V9.4Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9 9.4V6.7A1.7 1.7 0 0 1 10.7 5h2.6A1.7 1.7 0 0 1 15 6.7v2.7"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M3.8 13.4h16.4M9.6 12.1v2.6M14.4 12.1v2.6"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ScissorsIcon({
  size = defaults.size,
  color = defaults.color,
  strokeWidth = defaults.strokeWidth,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={6.2} cy={6.8} r={2.3} stroke={color} strokeWidth={strokeWidth} />
      <Circle cx={6.2} cy={17.2} r={2.3} stroke={color} strokeWidth={strokeWidth} />
      <Path
        d="M8.2 8.1 19.4 17.4M8.2 15.9 19.4 6.6"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function PrinterIcon({
  size = defaults.size,
  color = defaults.color,
  strokeWidth = defaults.strokeWidth,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 8.2V4.6h10v3.6"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M4.6 8.2h14.8v7.9a1.9 1.9 0 0 1-1.9 1.9h-1.6v-4H8.1v4H6.5a1.9 1.9 0 0 1-1.9-1.9V8.2Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8.1 14h7.8v5.4H8.1V14Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ShareIcon({
  size = defaults.size,
  color = defaults.color,
  strokeWidth = defaults.strokeWidth,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3.6v10.2"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Path
        d="M8.4 7.2 12 3.6l3.6 3.6"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M5.2 12.8v5.4a2 2 0 0 0 2 2h9.6a2 2 0 0 0 2-2v-5.4"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function PhotoIcon({
  size = defaults.size,
  color = defaults.color,
  strokeWidth = defaults.strokeWidth,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x={3.6}
        y={5}
        width={16.8}
        height={14}
        rx={3}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Circle cx={8.7} cy={9.8} r={1.7} stroke={color} strokeWidth={strokeWidth} />
      <Path
        d="M4.4 16.3 9.3 12l3.2 3 2.4-2.2 4.7 3.9"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function SearchIcon({
  size = 18,
  color = defaults.color,
  strokeWidth = 2,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={10.8} cy={10.8} r={6.2} stroke={color} strokeWidth={strokeWidth} />
      <Path
        d="m15.6 15.6 4.4 4.4"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function PlusIcon({
  size = 16,
  color = defaults.color,
  strokeWidth = 2.2,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 5v14M5 12h14"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function CloseIcon({
  size = 16,
  color = defaults.color,
  strokeWidth = 2.2,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="m6.4 6.4 11.2 11.2M17.6 6.4 6.4 17.6"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function TrashIcon({
  size = 18,
  color = defaults.color,
  strokeWidth = defaults.strokeWidth,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4.6 6.8h14.8M9.2 6.8V4.9h5.6v1.9M6.8 6.8l.8 12.1a1.9 1.9 0 0 0 1.9 1.7h5.1a1.9 1.9 0 0 0 1.9-1.7l.8-12.1"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M10.4 10.6v6.2M13.6 10.6v6.2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function DownloadIcon({
  size = 18,
  color = defaults.color,
  strokeWidth = defaults.strokeWidth,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3.8v10"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Path
        d="m8.2 10 3.8 3.8L15.8 10"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M4.8 15.4v3.1a1.9 1.9 0 0 0 1.9 1.9h10.6a1.9 1.9 0 0 0 1.9-1.9v-3.1"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function SlidersIcon({
  size = 18,
  color = defaults.color,
  strokeWidth = defaults.strokeWidth,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4.4 7.2h6.2M13.4 7.2h6.2M4.4 12h9.2M16.4 12h3.2M4.4 16.8h3.2M10.4 16.8h9.2"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Circle cx={12} cy={7.2} r={1.9} stroke={color} strokeWidth={strokeWidth} />
      <Circle cx={14.4} cy={12} r={1.9} stroke={color} strokeWidth={strokeWidth} />
      <Circle cx={8.4} cy={16.8} r={1.9} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function LayersIcon({
  size = defaults.size,
  color = defaults.color,
  strokeWidth = defaults.strokeWidth,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="m12 4.2 8 4.1-8 4.1-8-4.1 8-4.1Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="m5.2 12.4-1.2.6 8 4.1 8-4.1-1.2-.6"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="m5.2 16.4-1.2.6 8 4.1 8-4.1-1.2-.6"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function InfoIcon({
  size = 16,
  color = defaults.color,
  strokeWidth = 1.9,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={8.4} stroke={color} strokeWidth={strokeWidth} />
      <Path
        d="M12 11v5.2M12 7.9v.2"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}
