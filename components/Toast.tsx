import { useEffect, useRef } from "react";
import { Animated, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { T } from "@/constants/theme";

export type ToastType = "error" | "success" | "info";

interface ToastProps {
  visible: boolean;
  message: string;
  type: ToastType;
}

const CONFIG: Record<ToastType, { icon: string; color: string; bg: string; border: string }> = {
  error:   { icon: "alert-circle",     color: "#ff453a", bg: "rgba(255,69,58,0.12)",  border: "rgba(255,69,58,0.25)"  },
  success: { icon: "checkmark-circle", color: T.green,   bg: "rgba(46,204,138,0.12)", border: "rgba(46,204,138,0.25)" },
  info:    { icon: "information-circle", color: T.orange, bg: "rgba(255,94,31,0.12)", border: "rgba(255,94,31,0.25)"  },
};

export function Toast({ visible, message, type }: ToastProps) {
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const c = CONFIG[type];

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(opacity, { toValue: 1, useNativeDriver: true, speed: 20 }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 20 }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 16, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        bottom: insets.bottom + 100,
        left: 16,
        right: 16,
        opacity,
        transform: [{ translateY }],
        zIndex: 9999,
      }}
    >
      <View
        style={{
          backgroundColor: c.bg,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <Ionicons name={c.icon as "alert-circle"} size={20} color={c.color} />
        <Text style={{ flex: 1, fontSize: 14, color: T.text, fontFamily: T.font, lineHeight: 19 }}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}
