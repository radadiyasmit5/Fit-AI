import "../global.css";
import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/lib/auth-context";
import { ToastProvider } from "@/lib/toast-context";
import { DialogProvider } from "@/lib/dialog-context";

export default function RootLayout() {
  return (
    <AuthProvider>
      <ToastProvider>
        <DialogProvider>
          <StatusBar style="light" />
          <Slot />
        </DialogProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
