import { Text, TextInput, View, type TextInputProps } from "react-native";
import { T } from "@/constants/theme";

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
}

export function Input({ label, error, ...props }: InputProps) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text
        style={{
          fontSize: 11,
          color: T.text2,
          marginBottom: 6,
          fontFamily: T.font,
          fontWeight: "500",
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {label}
      </Text>
      <TextInput
        placeholderTextColor={T.text3}
        style={{
          backgroundColor: T.surface2,
          borderWidth: 1,
          borderColor: error ? "#ff453a" : T.border,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontSize: 14,
          color: T.text,
          fontFamily: T.font,
        }}
        {...props}
      />
      {error ? (
        <Text style={{ fontSize: 11, color: "#ff453a", marginTop: 4 }}>{error}</Text>
      ) : null}
    </View>
  );
}
