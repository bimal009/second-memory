import React, { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { Brain, ArrowRight } from "lucide-react-native";
import { Text } from "@/components/ui/Text";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { spacing } from "@/theme/spacing";
import { limeDeep } from "@/theme/tokens";
import { strings } from "@/constants/strings";
import { useTheme } from "@/theme/ThemeProvider";
import { useOnboard } from "@/client/me";
export function OnboardingScreen() {
    const { colors } = useTheme();
    const [name, setName] = useState("");
    const [nameFocused, setNameFocused] = useState(false);
    const [emptyError, setEmptyError] = useState(false);
    const onboard = useOnboard();
    const accent = colors.isDark ? colors.primary : limeDeep;
    const trimmed = name.trim();
    const error = emptyError
        ? "Enter a name between 1 and 30 characters."
        : onboard.isError
            ? strings.onboarding.saveError
            : null;
    const submit = () => {
        if (!trimmed) {
            setEmptyError(true);
            return;
        }
        setEmptyError(false);
        onboard.mutate({
            assistant_name: trimmed,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        });
    };
    return (<View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={[styles.brandMark, { backgroundColor: colors.primary }]}>
            <Brain size={24} color={colors.primaryForeground}/>
          </View>
          <Text variant="micro" style={styles.eyebrow}>
            {strings.appName.toUpperCase()}
          </Text>
        </View>
        <Text variant="display" style={styles.heroTitle}>
          {trimmed ? "Meet " + trimmed : strings.onboarding.title}
        </Text>
        <Text variant="caption" color="mutedForeground">
          {strings.onboarding.subtitle}
        </Text>
      </View>

      
      <Card padding="xl" style={[
            styles.nameCard,
            { backgroundColor: colors.secondary, borderColor: colors.secondary },
        ]}>
        <Text variant="micro" color="mutedForeground" style={styles.eyebrow}>
          {strings.onboarding.nameStep}
        </Text>
        <Text variant="heading">{strings.onboarding.assistantPrompt}</Text>
        <Text variant="caption" color="mutedForeground">
          {strings.onboarding.assistantHint}
        </Text>
        <TextInput accessibilityLabel={strings.onboarding.assistantPrompt} value={name} onChangeText={setName} onFocus={() => setNameFocused(true)} onBlur={() => setNameFocused(false)} autoCorrect={false} returnKeyType="done" placeholder={strings.onboarding.assistantPlaceholder} placeholderTextColor={colors.mutedForeground} maxLength={30} style={[
            styles.nameInput,
            {
                color: colors.foreground,
                backgroundColor: colors.card,
                borderColor: nameFocused ? accent : colors.input,
            },
        ]}/>
      </Card>

      <View style={styles.footer}>
        {error ? (<Text variant="caption" color="destructive" accessibilityRole="alert">
            {error}
          </Text>) : null}
        <Button label={error ? "Retry" : strings.onboarding.continue} size="lg" fullWidth loading={onboard.isPending} disabled={onboard.isPending} icon={<ArrowRight size={18} color={colors.primaryForeground}/>} onPress={submit}/>
      </View>
    </View>);
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
        gap: spacing.xl,
        width: "100%",
        maxWidth: 560,
        alignSelf: "center",
        paddingTop: spacing.xl,
    },
    header: {
        gap: spacing.md,
    },
    nameInput: {
        marginTop: spacing.md,
        minHeight: 56,
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: spacing.md,
        fontSize: 16,
    },
    brandRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        marginBottom: spacing.sm,
    },
    brandMark: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    eyebrow: { letterSpacing: 1.6 },
    heroTitle: { letterSpacing: -1.3, maxWidth: 310 },
    nameCard: { gap: spacing.sm, borderRadius: 24 },
    footer: {
        gap: spacing.sm,
        marginTop: spacing.md,
    },
});
