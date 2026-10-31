import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { cacheThumb } from "@/lib/media";

export function ThumbImage({ mediaId, height, style, }: {
    mediaId: string | null;
    height: number;
    style?: object;
}) {
    const [loaded, setLoaded] = useState<{ id: string; uri: string } | null>(null);
    useEffect(() => {
        if (!mediaId)
            return;
        let alive = true;
        void cacheThumb(mediaId).then((uri) => {
            if (alive && uri)
                setLoaded({ id: mediaId, uri });
        });
        return () => {
            alive = false;
        };
    }, [mediaId]);
    const base = {
        width: "100%",
        height,
    } as const;
    const current = loaded?.id === mediaId ? loaded.uri : null;
    if (!current) {
        return <View style={[base, styles.skeleton, ...(style ? [style] : [])]}/>;
    }
    return (
        <Image
            source={{ uri: current }}
            style={[base, styles.base, ...(style ? [style] : [])]}
            contentFit="cover"
            recyclingKey={current}
            transition={120}
        />
    );
}
const styles = StyleSheet.create({
    base: { borderRadius: 12, backgroundColor: "#101313" },
    skeleton: { borderRadius: 12, backgroundColor: "#101313" },
});
