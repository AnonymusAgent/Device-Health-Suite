import React, { useId, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { useColors } from '@/contexts/SettingsContext';
export function MiniChart({ data, width, height = 64, color, maxValue = 100 }: { data: number[]; width?: number; height?: number; color?: string; maxValue?: number }) {
  const c = useColors();
  const [measuredWidth, setMeasuredWidth] = useState(width || 240);
  const id = `mini-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const w = width || measuredWidth;
  const values = data.filter(Number.isFinite);
  const max = Number.isFinite(maxValue) && maxValue > 0 ? maxValue : 100;
  const stroke = color || c.primary;
  const points = values.map((value, index) => ({ x: values.length > 1 ? 3 + index / (values.length - 1) * (w - 6) : w / 2, y: height - 3 - Math.max(0, Math.min(1, value / max)) * (height - 6) }));
  const line = points.map((point, index) => `${index ? 'L' : 'M'}${point.x},${point.y}`).join(' ');
  return <View onLayout={event => { if (!width) setMeasuredWidth(event.nativeEvent.layout.width); }} style={{ width: width || '100%', height }}><Svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`}><Defs><LinearGradient id={id} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={stroke} stopOpacity={0.2} /><Stop offset="1" stopColor={stroke} stopOpacity={0} /></LinearGradient></Defs>{points.length > 1 && <Path d={`${line} L${points.at(-1)!.x},${height} L${points[0].x},${height} Z`} fill={`url(#${id})`} />}{line && <Path d={line} stroke={stroke} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />}{points.length === 1 && <Circle cx={points[0].x} cy={points[0].y} r={3} fill={stroke} />}</Svg></View>;
}
