import React, { createContext, useContext, useState, ReactNode } from "react";
import { CustomAlert } from "../components/CustomAlert";

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: "cancel" | "destructive" | "default";
}

interface AlertContextType {
  showAlert: (title: string, message: string, buttons?: AlertButton[]) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider = ({ children }: { children: ReactNode }) => {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [buttons, setButtons] = useState<AlertButton[]>([]);

  const showAlert = (
    t: string,
    m: string,
    b: AlertButton[] = [{ text: "OK" }]
  ) => {
    setTitle(t);
    setMessage(m);
    setButtons(b);
    setVisible(true);
  };

  const hideAlert = () => {
    setVisible(false);
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <CustomAlert
        visible={visible}
        title={title}
        message={message}
        buttons={buttons}
        onClose={hideAlert}
      />
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error("useAlert must be used within an AlertProvider");
  }
  return context;
};
