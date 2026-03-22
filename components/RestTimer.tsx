import { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface RestTimerProps {
  defaultSeconds?: number;
}

export function RestTimer({ defaultSeconds = 90 }: RestTimerProps) {
  const [seconds, setSeconds] = useState(defaultSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRunning && seconds > 0) {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => prev - 1);
      }, 1000);
    } else if (seconds === 0) {
      setIsRunning(false);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, seconds]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleToggle = () => {
    if (seconds === 0) {
      setSeconds(defaultSeconds);
      setIsRunning(true);
    } else {
      setIsRunning(!isRunning);
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setSeconds(defaultSeconds);
  };

  return (
    <View className="flex-row items-center justify-between rounded-xl bg-dark-card px-4 py-3">
      <View className="flex-row items-center">
        <Ionicons name="timer-outline" size={20} color="#FF6B35" />
        <Text className="ml-2 text-sm text-gray-400">Rest</Text>
      </View>
      <Text
        className={`text-2xl font-bold ${seconds === 0 ? "text-green-400" : "text-white"}`}
      >
        {formatTime(seconds)}
      </Text>
      <View className="flex-row gap-2">
        <TouchableOpacity onPress={handleToggle} hitSlop={8}>
          <Ionicons
            name={isRunning ? "pause" : "play"}
            size={24}
            color="#FF6B35"
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleReset} hitSlop={8}>
          <Ionicons name="refresh" size={24} color="#8E8E93" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
