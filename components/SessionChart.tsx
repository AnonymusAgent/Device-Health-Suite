import React, { useId, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Line, Path, Stop, Text as SvgText } from 'react-native-svg';
import { useColors } from '@/contexts/SettingsContext';
import type { SessionSample } from '@/contexts/SessionContext';
import { formatTime } from '@/lib/diagnostics';
import { chartPoints, chartSegments, sessionStatistics } from '@/lib/session';
import { Text } from './ui';

/** Pauses longer than this break a line into separate segments instead of bridging the gap. */
const MAX_GAP_MS = 15000;

export function SessionChart({ samples, metric, windowMs, height = 225 }: { samples: SessionSample[]; metric: 'frameRate' | 'batteryLevel'; windowMs: number; height?: number }) {
  const c = useColors();
  const [width, setWidth] = useState(600);
  const gradientId = `session-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const now = samples.length ? samples[samples.length - 1].timestamp : Date.now();
  const end = now;
  const start = end - windowMs;
  const points = chartPoints(samples, metric, windowMs, now);
  const segments = chartSegments(points, MAX_GAP_MS);
  const stats = sessionStatistics(samples, metric, windowMs, now);
  const max = metric === 'batteryLevel' ? 100 : Math.max(60, Math.ceil(Math.max(0, ...points.map(point => point.y)) / 30) * 30);
  const plot = { left: 38, right: width - 12, top: 15, bottom: height - 30 };
  const x = (value: number) => plot.left + Math.max(0, Math.min(1, (value - start) / windowMs)) * (plot.right - plot.left);
  const y = (value: number) => plot.bottom - Math.max(0, Math.min(1, value / max)) * (plot.bottom - plot.top);
  const line = segments.map(segment => segment.map((point, index) => `${index ? 'L' : 'M'}${x(point.x).toFixed(1)},${y(point.y).toFixed(1)}`).join(' ')).join(' ');
  const area = segments.filter(segment => segment.length > 1).map(segment => `M${x(segment[0].x)},${plot.bottom} L${segment.map(point => `${x(point.x)},${y(point.y)}`).join(' L')} L${x(segment[segment.length - 1].x)},${plot.bottom} Z`).join(' ');
  const summary = points.length
    ? `${metric === 'frameRate' ? 'App JavaScript frame cadence' : 'Battery charge'}: ${stats.count} samples${stats.latest !== null ? `, latest ${stats.latest.toFixed(1)}${metric === 'batteryLevel' ? ' percent' : ' frames per second'}` : ''}.`
    : 'No samples yet for this metric.';
  return <View accessibilityLabel={summary} onLayout={event => setWidth(Math.max(220, event.nativeEvent.layout.width))} style={{ width: '100%', height, position: 'relative' }}>
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}><Defs><SvgGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={c.primary} stopOpacity={0.17} /><Stop offset="1" stopColor={c.primary} stopOpacity={0.01} /></SvgGradient></Defs>
      {[0, 0.25, 0.5, 0.75, 1].map(part => <React.Fragment key={part}><Line x1={plot.left} x2={plot.right} y1={y(max * part)} y2={y(max * part)} stroke={c.chartGrid} strokeDasharray="3 5" /><SvgText x={plot.left - 10} y={y(max * part) + 4} textAnchor="end" fill={c.textTertiary} fontSize={10}>{Math.round(max * part)}</SvgText></React.Fragment>)}
      {area ? <Path d={area} fill={`url(#${gradientId})`} /> : null}
      {line ? <Path d={line} fill="none" stroke={c.primary} strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round" /> : null}
      {points.length === 1 && <Circle cx={x(points[0].x)} cy={y(points[0].y)} r={4} fill={c.primary} />}
      {[start, start + windowMs / 2, end].map((time, index) => <SvgText key={index} x={x(time)} y={height - 7} textAnchor={index === 0 ? 'start' : index === 2 ? 'end' : 'middle'} fill={c.textTertiary} fontSize={10}>{formatTime(time)}</SvgText>)}
    </Svg>
    {points.length < 2 && <View pointerEvents="none" style={{ position: 'absolute', top: '38%', left: 40, right: 15, alignItems: 'center' }}><Text style={{ color: c.textSecondary, fontSize: 12, textAlign: 'center', backgroundColor: c.surface, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 }}>{points.length === 1 ? 'One sample captured. Waiting for the next.' : metric === 'batteryLevel' ? 'Battery readings aren’t available in this session.' : 'Start the session to see your activity.'}</Text></View>}
  </View>;
}
