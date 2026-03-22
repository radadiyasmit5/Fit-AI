import { Ionicons } from "@expo/vector-icons";
import { useAuthContext } from "@/lib/auth-context";
import { callEdgeFunction } from "@/lib/claude";
import { supabase } from "@/lib/supabase";
import { T } from "@/constants/theme";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED_QUESTIONS = [
  "Am I eating enough for muscle gain?",
  "Should I train today?",
  "How's my progress this week?",
];

export function AICoach() {
  const { profile, user } = useAuthContext();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const fetchContext = async () => {
    if (!user || !profile) return { profile, recentMeals: [], recentWorkouts: [] };
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [mealsRes, sessionsRes] = await Promise.all([
      supabase
        .from("meals")
        .select("calories, protein, carbs, fat, logged_at")
        .eq("user_id", user.id)
        .gte("logged_at", weekAgo.toISOString()),
      supabase
        .from("workout_sessions")
        .select("started_at, completed_at")
        .eq("user_id", user.id)
        .not("completed_at", "is", null)
        .gte("started_at", weekAgo.toISOString()),
    ]);

    return {
      profile,
      recentMeals: mealsRes.data ?? [],
      recentWorkouts: sessionsRes.data ?? [],
    };
  };

  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const newMessages: Message[] = [...messages, { role: "user", content }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);

    const context = await fetchContext();
    const { data, error } = await callEdgeFunction<{ response: string }>("ai-coach", {
      messages: newMessages,
      context,
    });

    const reply = data?.response ?? (error ? "Sorry, I couldn't connect. Try again." : "");
    setMessages([...newMessages, { role: "assistant", content: reply }]);
    setLoading(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <>
      <TouchableOpacity
        style={{
          position: "absolute",
          bottom: 100,
          right: 16,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: T.orange,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: T.orange,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 8,
          elevation: 8,
          zIndex: 999,
        }}
        onPress={() => setOpen(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="chatbubble-ellipses" size={24} color="#fff" />
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: T.bg }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottomWidth: 1,
              borderBottomColor: T.border,
              paddingHorizontal: 16,
              paddingTop: 20,
              paddingBottom: 12,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: T.orange,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="fitness" size={18} color="#fff" />
              </View>
              <View>
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>AI Coach</Text>
                <Text style={{ color: T.text2, fontSize: 11 }}>Knows your full history</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setOpen(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={24} color={T.text2} />
            </TouchableOpacity>
          </View>

          {/* Messages */}
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16 }}
            keyboardShouldPersistTaps="handled"
          >
            {messages.length === 0 ? (
              <View style={{ alignItems: "center", paddingTop: 40 }}>
                <View
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 36,
                    backgroundColor: "rgba(255,107,53,0.15)",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 16,
                  }}
                >
                  <Ionicons name="fitness" size={36} color={T.orange} />
                </View>
                <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 8 }}>
                  Your AI Coach
                </Text>
                <Text style={{ color: T.text2, fontSize: 14, textAlign: "center", marginBottom: 24 }}>
                  I know your meals, workouts, and goals. Ask me anything.
                </Text>
                {SUGGESTED_QUESTIONS.map((q) => (
                  <TouchableOpacity
                    key={q}
                    style={{
                      borderWidth: 1,
                      borderColor: T.surface,
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      marginBottom: 8,
                      width: "100%",
                    }}
                    onPress={() => sendMessage(q)}
                  >
                    <Text style={{ color: T.orange, fontSize: 14 }}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              messages.map((msg, idx) => (
                <View
                  key={idx}
                  style={{
                    maxWidth: "85%",
                    alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                    backgroundColor: msg.role === "user" ? T.orange : T.surface2,
                    borderRadius: 18,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    marginBottom: 10,
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 15, lineHeight: 22 }}>{msg.content}</Text>
                </View>
              ))
            )}
            {loading && (
              <View
                style={{
                  alignSelf: "flex-start",
                  backgroundColor: T.surface2,
                  borderRadius: 18,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  marginBottom: 10,
                }}
              >
                <ActivityIndicator size="small" color={T.orange} />
              </View>
            )}
          </ScrollView>

          {/* Input */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-end",
              gap: 8,
              borderTopWidth: 1,
              borderTopColor: T.border,
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}
          >
            <TextInput
              style={{
                flex: 1,
                backgroundColor: T.surface2,
                borderRadius: 20,
                paddingHorizontal: 16,
                paddingVertical: 10,
                color: "#fff",
                fontSize: 15,
                maxHeight: 100,
              }}
              placeholder="Ask your coach..."
              placeholderTextColor={T.text2}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={() => sendMessage()}
            />
            <TouchableOpacity
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: input.trim() && !loading ? T.orange : T.surface,
                alignItems: "center",
                justifyContent: "center",
              }}
              onPress={() => sendMessage()}
              disabled={!input.trim() || loading}
              activeOpacity={0.75}
            >
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
