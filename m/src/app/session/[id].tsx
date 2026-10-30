import { Redirect, useLocalSearchParams } from "expo-router";
export default function LegacyRun() { const { id } = useLocalSearchParams<{ id: string }>(); return <Redirect href={{ pathname: "/run/[id]", params: { id } }} />; }
