import { createContext, useCallback, useContext, useRef, useState } from "react";
import { Toast, type ToastType } from "@/components/Toast";

interface ToastContextType {
  show: (message: string, type?: ToastType) => void;
  error: (message: string) => void;
  success: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [type, setType] = useState<ToastType>("info");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((msg: string, t: ToastType = "info") => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setMessage(msg);
    setType(t);
    setVisible(true);
    timerRef.current = setTimeout(() => setVisible(false), 3000);
  }, []);

  const error   = useCallback((msg: string) => show(msg, "error"),   [show]);
  const success = useCallback((msg: string) => show(msg, "success"), [show]);
  const info    = useCallback((msg: string) => show(msg, "info"),    [show]);

  return (
    <ToastContext.Provider value={{ show, error, success, info }}>
      {children}
      <Toast visible={visible} message={message} type={type} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
