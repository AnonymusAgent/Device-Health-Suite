import React from 'react';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
export function DeviceArt() {
  return <Svg width={210} height={190} viewBox="0 0 210 190" pointerEvents="none">
    <Ellipse cx={111} cy={106} rx={88} ry={65} fill="none" stroke="#B7D2B8" strokeWidth={1} strokeDasharray="3 6" transform="rotate(-22 111 106)" />
    <Ellipse cx={111} cy={106} rx={70} ry={85} fill="none" stroke="#C7DCC3" strokeWidth={1} transform="rotate(32 111 106)" />
    <Circle cx={35} cy={76} r={5} fill="#91B59A" /><Circle cx={181} cy={131} r={4} fill="#91B59A" /><Circle cx={154} cy={28} r={3} fill="#7FA589" />
    <G transform="rotate(12 111 99)">
      <Rect x={70} y={24} width={83} height={151} rx={19} fill="#AAC5AB" opacity={0.35} transform="translate(5 6)" />
      <Rect x={68} y={20} width={83} height={151} rx={19} fill="#245B46" />
      <Rect x={73} y={25} width={73} height={141} rx={15} fill="#F5FAEF" />
      <Rect x={94} y={31} width={30} height={6} rx={3} fill="#245B46" />
      <Circle cx={109.5} cy={78} r={22} fill="#E1EEDC" />
      <Path d="M99 78l7 7 15-16" fill="none" stroke="#387653" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      <Rect x={88} y={111} width={43} height={5} rx={2.5} fill="#B4CDB0" />
      <Rect x={95} y={121} width={29} height={4} rx={2} fill="#D1DFC9" />
      <Path d="M84 145h9l5-9 7 15 7-12 5 6h10" fill="none" stroke="#719D72" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Rect x={98} y={158} width={24} height={3} rx={1.5} fill="#B4CDB0" />
    </G>
    <Circle cx={55} cy={137} r={19} fill="#F7FBF2" stroke="#D5E4CE" /><Path d="M47 137l5 5 11-11" fill="none" stroke="#477E55" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>;
}
