import React from 'react';
import { View } from 'react-native';
import Svg, { Polyline, Defs, LinearGradient, Stop, Rect, ClipPath } from 'react-native-svg';
import Colors from '@/constants/colors';

interface MiniChartProps {
  data: number[];
  width: number;
  height: number;
  color?: string;
  maxValue?: number;
  filled?: boolean;
}

export function MiniChart({ data, width, height, color = Colors.dark.primary, maxValue = 100, filled = true }: MiniChartProps) {
  if (data.length < 2) return <View style={{ width, height }} />;

  const padding = 2;
  const chartW = width - padding * 2;
  const chartH = height - padding * 2;

  const points = data.map((val, i) => {
    const x = padding + (i / (data.length - 1)) * chartW;
    const y = padding + chartH - (Math.min(val, maxValue) / maxValue) * chartH;
    return `${x},${y}`;
  }).join(' ');

  const fillPoints = `${padding},${padding + chartH} ${points} ${padding + chartW},${padding + chartH}`;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.3" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </LinearGradient>
        <ClipPath id="clip">
          <Rect x={padding} y={padding} width={chartW} height={chartH} />
        </ClipPath>
      </Defs>
      {filled && (
        <Polyline
          points={fillPoints}
          fill="url(#fillGrad)"
          stroke="none"
          clipPath="url(#clip)"
        />
      )}
      <Polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        clipPath="url(#clip)"
      />
    </Svg>
  );
}
