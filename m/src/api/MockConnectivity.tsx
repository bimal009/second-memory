import { useEffect } from "react";
import { useNetworkState } from "expo-network";
import { setNetworkOffline } from "./previewState";
export function MockConnectivity() {
  const network = useNetworkState();
  useEffect(() => {
    setNetworkOffline(
      network.isConnected === false || network.isInternetReachable === false,
    );
  }, [network.isConnected, network.isInternetReachable]);
  return null;
}
