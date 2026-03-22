import { View, Text } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import { T } from "@/constants/theme";

interface MacroRingProps {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  goals: { calories: number; protein: number; carbs: number; fat: number };
}

// r=48 → 2π×48=301.6, r=37 → 2π×37=232.5, r=26 → 2π×26=163.4
const R  = { outer: 48, mid: 37, inner: 26 };
const SW = { outer: 8,  mid: 7,  inner: 6  };
const DA = {
  outer: 2 * Math.PI * R.outer, // 301.6
  mid:   2 * Math.PI * R.mid,   // 232.5
  inner: 2 * Math.PI * R.inner, // 163.4
};

function prog(val: number, goal: number) {
  return goal > 0 ? Math.min(val / goal, 1) : 0;
}

interface MacroBarProps {
  label: string;
  value: number;
  goal: number;
  unit: string;
  color: string;
}

function MacroBar({ label, value, goal, unit, color }: MacroBarProps) {
  const p = goal > 0 ? Math.min(value / goal, 1) : 0;
  return (
    <View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
        <Text style={{ fontSize: 11, color: T.text2, fontFamily: T.font }}>{label}</Text>
        <Text style={{ fontSize: 11, fontFamily: T.mono }}>
          <Text style={{ color: T.text }}>{Math.round(value)}{unit}</Text>
          <Text style={{ color: T.text3 }}> / {goal}{unit}</Text>
        </Text>
      </View>
      {/* FIX 2: bar height 6px, border-radius 6px */}
      <View style={{ height: 6, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 6 }}>
        <View
          style={{
            height: "100%",
            width: `${p * 100}%`,
            backgroundColor: color,
            borderRadius: 6,
          }}
        />
      </View>
    </View>
  );
}

export function MacroRing({ calories, protein, carbs, fat, goals }: MacroRingProps) {
  const calP  = prog(calories, goals.calories);
  const protP = prog(protein,  goals.protein);
  const carbP = prog(carbs,    goals.carbs);
  const remaining = Math.max(goals.calories - calories, 0);

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 14,
        backgroundColor: T.surface2,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: T.border,
        padding: 20,
        flexDirection: "row",
        alignItems: "center",
        gap: 20,
      }}
    >
      {/* FIX 1: 110×110 ring with correct radii */}
      <View style={{ width: 110, height: 110, position: "relative" }}>
        <Svg
          width={110}
          height={110}
          viewBox="-55 -55 110 110"
        >
          <G transform="rotate(-90)">
            {/* Tracks */}
            <Circle r={R.outer} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={SW.outer} />
            <Circle r={R.mid}   fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={SW.mid}   />
            <Circle r={R.inner} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={SW.inner} />
            {/* Progress arcs */}
            <Circle
              r={R.outer} fill="none" stroke={T.orange} strokeWidth={SW.outer}
              strokeDasharray={`${DA.outer} ${DA.outer}`}
              strokeDashoffset={DA.outer * (1 - calP)}
              strokeLinecap="round"
            />
            <Circle
              r={R.mid} fill="none" stroke={T.blue} strokeWidth={SW.mid}
              strokeDasharray={`${DA.mid} ${DA.mid}`}
              strokeDashoffset={DA.mid * (1 - protP)}
              strokeLinecap="round"
            />
            <Circle
              r={R.inner} fill="none" stroke={T.amber} strokeWidth={SW.inner}
              strokeDasharray={`${DA.inner} ${DA.inner}`}
              strokeDashoffset={DA.inner * (1 - carbP)}
              strokeLinecap="round"
            />
          </G>
        </Svg>
        {/* Center label — position:absolute centered over SVG */}
        <View
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0, bottom: 0,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 22, fontWeight: "700", color: T.orange, fontFamily: T.mono, lineHeight: 24 }}>
            {Math.round(calories)}
          </Text>
          <Text style={{ fontSize: 9, color: T.text2, textTransform: "uppercase", letterSpacing: 0.6, fontFamily: T.font }}>
            kcal
          </Text>
          <Text style={{ fontSize: 9, color: T.text3, fontFamily: T.mono, marginTop: 1 }}>
            / {goals.calories}
          </Text>
        </View>
      </View>

      {/* Macro bars + FIX 5 remaining strip */}
      <View style={{ flex: 1 }}>
        <View style={{ gap: 10 }}>
          <MacroBar label="Calories" value={calories} goal={goals.calories} unit=""  color={T.orange} />
          <MacroBar label="Protein"  value={protein}  goal={goals.protein}  unit="g" color={T.blue}   />
          <MacroBar label="Carbs"    value={carbs}     goal={goals.carbs}    unit="g" color={T.amber}  />
          <MacroBar label="Fat"      value={fat}       goal={goals.fat}      unit="g" color={T.green}  />
        </View>

        {/* FIX 5: Remaining today strip */}
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: "rgba(255,255,255,0.06)",
            paddingTop: 12,
            marginTop: 12,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 11, color: T.text2, fontFamily: T.font }}>Remaining today</Text>
          <Text style={{ fontSize: 13, fontWeight: "600", color: T.text, fontFamily: T.mono }}>
            {remaining} kcal
          </Text>
        </View>
      </View>
    </View>
  );
}
