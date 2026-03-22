import { Modal, View, Text, TouchableOpacity } from "react-native";
import { T } from "@/constants/theme";

export interface DialogButton {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress: () => void;
}

interface DialogProps {
  visible: boolean;
  title: string;
  message?: string;
  buttons: DialogButton[];
}

export function Dialog({ visible, title, message, buttons }: DialogProps) {
  const sideBySide = buttons.length === 2;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.65)",
          alignItems: "center",
          justifyContent: "center",
          padding: 32,
        }}
      >
        <View
          style={{
            backgroundColor: T.surface2,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: T.border,
            padding: 24,
            width: "100%",
            maxWidth: 360,
          }}
        >
          <Text
            style={{
              fontSize: 17,
              fontWeight: "600",
              color: T.text,
              fontFamily: T.font,
              textAlign: "center",
              marginBottom: message ? 8 : 24,
            }}
          >
            {title}
          </Text>

          {message ? (
            <Text
              style={{
                fontSize: 14,
                color: T.text2,
                fontFamily: T.font,
                lineHeight: 20,
                textAlign: "center",
                marginBottom: 24,
              }}
            >
              {message}
            </Text>
          ) : null}

          {sideBySide ? (
            <View style={{ flexDirection: "row", gap: 8 }}>
              {buttons.map((btn, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={btn.onPress}
                  activeOpacity={0.75}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 10,
                    alignItems: "center",
                    backgroundColor:
                      btn.style === "destructive"
                        ? "#ff453a"
                        : btn.style === "cancel"
                        ? "transparent"
                        : T.orange,
                    borderWidth: btn.style === "cancel" ? 1 : 0,
                    borderColor: T.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: btn.style === "cancel" ? "400" : "600",
                      color: btn.style === "cancel" ? T.text2 : "#fff",
                      fontFamily: T.font,
                    }}
                  >
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {buttons.map((btn, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={btn.onPress}
                  activeOpacity={0.75}
                  style={{
                    paddingVertical: 12,
                    borderRadius: 10,
                    alignItems: "center",
                    backgroundColor:
                      btn.style === "destructive"
                        ? "#ff453a"
                        : btn.style === "cancel"
                        ? "transparent"
                        : T.orange,
                    borderWidth: btn.style === "cancel" ? 1 : 0,
                    borderColor: T.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: btn.style === "cancel" ? "400" : "600",
                      color: btn.style === "cancel" ? T.text2 : "#fff",
                      fontFamily: T.font,
                    }}
                  >
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
