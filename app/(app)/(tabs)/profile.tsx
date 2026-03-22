import { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthContext } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { useToast } from "@/lib/toast-context";
import { useDialog } from "@/lib/dialog-context";
import type { FitnessGoal } from "@/lib/database.types";
import { T } from "@/constants/theme";

const GOALS: { value: FitnessGoal; label: string }[] = [
  { value: "lose_weight", label: "Lose Weight" },
  { value: "build_muscle", label: "Build Muscle" },
  { value: "maintain", label: "Stay Fit" },
];

export default function ProfileScreen() {
  const { user, profile, signOut } = useAuthContext();
  const toast = useToast();
  const dialog = useDialog();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile?.name ?? "");
  const [age, setAge] = useState(profile?.age?.toString() ?? "");
  const [weight, setWeight] = useState(profile?.weight?.toString() ?? "");
  const [height, setHeight] = useState(profile?.height?.toString() ?? "");
  const [goal, setGoal] = useState<FitnessGoal | null>(profile?.goal ?? null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user || !name.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ name: name.trim(), age: age ? parseInt(age, 10) : null, weight: weight ? parseFloat(weight) : null, height: height ? parseFloat(height) : null, goal })
        .eq("id", user.id);
      if (error) throw error;
      setEditing(false);
      toast.success("Profile saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    const ok = await dialog.confirm("Sign Out", "Are you sure you want to sign out?", { confirmText: "Sign Out", destructive: true });
    if (ok) signOut();
  };

  const goalLabel =
    profile?.goal === "lose_weight" ? "Lose Weight"
    : profile?.goal === "build_muscle" ? "Build Muscle"
    : profile?.goal === "maintain" ? "Stay Fit"
    : "—";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>

        {/* Avatar Card */}
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 20,
            marginBottom: 12,
            backgroundColor: T.surface2,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: T.border,
            paddingVertical: 28,
            paddingHorizontal: 20,
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: T.orange,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <Text style={{ fontSize: 24, fontWeight: "600", color: "#fff", fontFamily: T.font }}>
              {(profile?.name ?? "?")[0].toUpperCase()}
            </Text>
          </View>
          <Text style={{ fontSize: 18, fontWeight: "600", color: T.text, fontFamily: T.font }}>
            {profile?.name ?? "Guest"}
          </Text>
          <Text style={{ fontSize: 13, color: T.text2, marginTop: 4, fontFamily: T.font }}>
            {user?.email ?? ""}
          </Text>
        </View>

        {/* Details Card */}
        <View
          style={{
            marginHorizontal: 16,
            marginBottom: 12,
            backgroundColor: T.surface2,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: T.border,
            overflow: "hidden",
          }}
        >
          {/* Card Header */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: T.border,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: "500", color: T.text, fontFamily: T.font }}>
              Details
            </Text>
            <TouchableOpacity onPress={() => setEditing(!editing)}>
              <Text style={{ fontSize: 13, color: T.orange, fontFamily: T.font }}>
                {editing ? "Cancel" : "Edit"}
              </Text>
            </TouchableOpacity>
          </View>

          {editing ? (
            <View style={{ padding: 16 }}>
              <Input label="Name" value={name} onChangeText={setName} />
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1 }}><Input label="Age" value={age} onChangeText={setAge} keyboardType="number-pad" /></View>
                <View style={{ flex: 1 }}><Input label="Weight (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" /></View>
                <View style={{ flex: 1 }}><Input label="Height (cm)" value={height} onChangeText={setHeight} keyboardType="decimal-pad" /></View>
              </View>
              <Text style={{ fontSize: 11, color: T.text2, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5, fontFamily: T.font }}>
                Goal
              </Text>
              <View style={{ gap: 8, marginBottom: 16 }}>
                {GOALS.map((g) => (
                  <TouchableOpacity
                    key={g.value}
                    onPress={() => setGoal(g.value)}
                    style={{
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: goal === g.value ? T.orange : T.border,
                      backgroundColor: goal === g.value ? T.orangeDim : "transparent",
                      padding: 12,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: goal === g.value ? "500" : "400", color: goal === g.value ? T.orange : T.text2, fontFamily: T.font }}>
                      {g.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Button title="Save Changes" onPress={handleSave} loading={saving} />
            </View>
          ) : (
            <>
              <DetailRow label="Age" value={profile?.age ? `${profile.age} years` : "—"} isLast={false} />
              <DetailRow label="Weight" value={profile?.weight ? `${profile.weight} kg` : "—"} isLast={false} />
              <DetailRow label="Height" value={profile?.height ? `${profile.height} cm` : "—"} isLast={false} />
              <DetailRow label="Goal" value={goalLabel} isLast />
            </>
          )}
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          onPress={handleSignOut}
          activeOpacity={0.75}
          style={{
            marginHorizontal: 16,
            borderWidth: 1,
            borderColor: T.border,
            borderRadius: 14,
            padding: 14,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "500", color: T.text2, fontFamily: T.font }}>
            Sign Out
          </Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={{ fontSize: 11, color: T.text3, textAlign: "center", marginTop: 16, marginBottom: 24, fontFamily: T.font }}>
          Fit-AI v1.0.0
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({ label, value, isLast }: { label: string; value: string; isLast: boolean }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: T.border,
      }}
    >
      <Text style={{ fontSize: 13, color: T.text2, fontFamily: T.font }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: "500", color: T.text, fontFamily: T.font }}>{value}</Text>
    </View>
  );
}
