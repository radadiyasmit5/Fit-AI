import { ActivityIndicator, Text, TouchableOpacity } from "react-native";
import { T } from "@/constants/theme";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "outline" | "ghost";
  loading?: boolean;
  disabled?: boolean;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
      style={{
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: "center",
        justifyContent: "center",
        opacity: isDisabled ? 0.5 : 1,
        backgroundColor:
          variant === "primary" ? T.orange : "transparent",
        borderWidth: variant === "outline" ? 1 : 0,
        borderColor: variant === "outline" ? T.border : undefined,
      }}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? "#fff" : T.text2} />
      ) : (
        <Text
          style={{
            fontSize: 14,
            fontWeight: "500",
            fontFamily: T.font,
            color: variant === "primary" ? "#fff" : T.text2,
          }}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}
