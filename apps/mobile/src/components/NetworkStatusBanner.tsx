import * as Network from "expo-network";
import { StatusBanner } from "./ui";
import { t } from "../i18n";
import { setNetworkOffline } from "../api/networkState";
import { useEffect } from "react";

export function NetworkStatusBanner() {
  const state = Network.useNetworkState();
  const offline =
    state.isConnected === false || state.isInternetReachable === false;
  useEffect(() => {
    setNetworkOffline(
      state.isConnected == null && state.isInternetReachable == null
        ? null
        : offline,
    );
  }, [offline, state.isConnected, state.isInternetReachable]);
  return offline ? (
    <StatusBanner
      kind="warning"
      title={t("common.offline")}
      body={t("common.offlineBody")}
    />
  ) : null;
}
