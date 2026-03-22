import { createContext, useCallback, useContext, useState } from "react";
import { Dialog, type DialogButton } from "@/components/Dialog";

interface DialogConfig {
  title: string;
  message?: string;
  buttons: DialogButton[];
}

interface DialogContextType {
  confirm: (
    title: string,
    message?: string,
    options?: { confirmText?: string; cancelText?: string; destructive?: boolean }
  ) => Promise<boolean>;
  show: (config: DialogConfig) => void;
}

const DialogContext = createContext<DialogContextType | null>(null);

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<DialogConfig | null>(null);

  const dismiss = useCallback(() => setConfig(null), []);

  const confirm = useCallback(
    (
      title: string,
      message?: string,
      options?: { confirmText?: string; cancelText?: string; destructive?: boolean }
    ): Promise<boolean> =>
      new Promise((resolve) => {
        setConfig({
          title,
          message,
          buttons: [
            {
              text: options?.cancelText ?? "Cancel",
              style: "cancel",
              onPress: () => { dismiss(); resolve(false); },
            },
            {
              text: options?.confirmText ?? "Confirm",
              style: options?.destructive ? "destructive" : "default",
              onPress: () => { dismiss(); resolve(true); },
            },
          ],
        });
      }),
    [dismiss]
  );

  const show = useCallback((cfg: DialogConfig) => {
    setConfig({
      ...cfg,
      buttons: cfg.buttons.map((btn) => ({
        ...btn,
        onPress: () => { dismiss(); btn.onPress(); },
      })),
    });
  }, [dismiss]);

  return (
    <DialogContext.Provider value={{ confirm, show }}>
      {children}
      {config && (
        <Dialog
          visible
          title={config.title}
          message={config.message}
          buttons={config.buttons}
        />
      )}
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogContextType {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog must be used within DialogProvider");
  return ctx;
}
