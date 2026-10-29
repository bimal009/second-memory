import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Eye, EyeOff, Trash2 } from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { GradientFrame, HighlightPolygon } from "@/components/domain/FrameWithHighlight";
import { LocationCard } from "@/components/domain/LocationCard";
import { useTheme } from "@/theme/ThemeProvider";
import { api } from "@/api";
import type { Memory } from "@/types";
import { limeDeep, radius } from "@/theme/tokens";
import { spacing } from "@/theme/spacing";
import { strings } from "@/constants/strings";

export type MemoryDetailProps = {
  id: string;
  onDelete: (id: string) => void;
};

export function MemoryDetail({ id, onDelete }: MemoryDetailProps) {
  const { colors } = useTheme();
  const [memory, setMemory] = useState<Memory | null>(null);
  const [missing, setMissing] = useState(false);
  const [highlightOn, setHighlightOn] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    let live = true;
    api.getMemory(id).then((m) => {
      if (!live) return;
      if (!m) {
        setMissing(true);
      } else {
        setMemory(m);
      }
    });
    return () => {
      live = false;
    };
  }, [id]);

  if (missing || !memory) {
    return (
      <ScreenContainer>
        <View style={styles.skeletonWrap}>
          <Skeleton height={220} style={styles.gapBelow} />
          <Skeleton width="50%" style={styles.gapBelow} />
          <Skeleton height={12} width="90%" />
        </View>
      </ScreenContainer>
    );
  }

  const stroke = colors.isDark ? colors.primary : limeDeep;

  return (
    <ScreenContainer scroll padBottom={24}>
      {/* Large frame with highlight toggle */}
      <View style={styles.frameWrap}>
        <GradientFrame seed={memory.frameSeed} aspect={4 / 3} corners={radius.base} />
        {highlightOn && memory.highlight ? (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <HighlightPolygon
              mask={memory.highlight.mask}
              aspect={4 / 3}
              stroke={stroke}
              fill="rgba(163, 230, 53, 0.28)"
            />
          </View>
        ) : null}
        <View style={styles.toggle}>
          <IconButton
            accessibilityLabel={
              highlightOn
                ? strings.memories.detail.highlightOn
                : strings.memories.detail.highlightOff
            }
            onPress={() => setHighlightOn((v) => !v)}
            selected={highlightOn}
            icon={
              highlightOn ? (
                <EyeOff size={18} color={colors.primaryForeground} />
              ) : (
                <Eye size={18} color={colors.foreground} />
              )
            }
          />
        </View>
      </View>

      <Text variant="title">{memory.title}</Text>
      <Text variant="caption" color="mutedForeground">
        {memory.startedAtLabel} · {memory.kind}
      </Text>

      <View style={styles.tagsRow}>
        {memory.tags.map((t) => (
          <Badge key={t} label={t} tone="outline" />
        ))}
      </View>

      <Card padding="lg">
        <Text variant="micro" color="mutedForeground">
          {strings.memories.detail.transcriptTitle}
        </Text>
        <Text variant="body">{memory.transcript}</Text>
        <Text variant="caption" color="mutedForeground">
          {memory.summary}
        </Text>
      </Card>

      {memory.location ? <LocationCard location={memory.location} /> : null}

      <Button
        label={strings.memories.detail.delete}
        variant="danger"
        onPress={() => setConfirmOpen(true)}
        icon={<Trash2 size={18} color={colors.destructive} />}
      />

      <BottomSheet
        visible={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={strings.memories.detail.deleteConfirmTitle}
      >
        <Text variant="caption" color="mutedForeground">
          {strings.memories.detail.deleteConfirmBody}
        </Text>
        <Button
          label={strings.common.delete}
          variant="danger"
          onPress={() => {
            setConfirmOpen(false);
            onDelete(memory.id);
          }}
          icon={<Trash2 size={18} color={colors.destructive} />}
        />
        <Button
          label={strings.common.cancel}
          variant="secondary"
          onPress={() => setConfirmOpen(false)}
        />
      </BottomSheet>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  skeletonWrap: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  gapBelow: { marginBottom: spacing.md },
  frameWrap: {
    position: "relative",
    aspectRatio: 4 / 3,
    borderRadius: radius.base,
    overflow: "hidden",
  },
  toggle: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
});
