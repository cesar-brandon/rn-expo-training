import { useColorScheme } from "react-native";
import { PortalProvider, TamaguiProvider, type TamaguiProviderProps } from "tamagui";
import tamaguiConfig from "tamagui.config";

export function Provider({
  children,
  ...rest
}: Omit<TamaguiProviderProps, "config">) {
  const colorScheme = useColorScheme();

  return (
    <TamaguiProvider
      config={tamaguiConfig}
      defaultTheme={colorScheme === "dark" ? "dark" : "light"}
      {...rest}
    >
      <PortalProvider shouldAddRootHost>
        {children}
      </PortalProvider>
    </TamaguiProvider>
  );
}
