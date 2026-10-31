import React, { useState } from "react";
import { ActivityIndicator, TextInput, View, StyleSheet } from "react-native";
import * as Speech from "expo-speech";
import { Volume2 } from "lucide-react-native";
import { askQuestion } from "@/api/ask";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/spacing";
import type { AskAnswer } from "@repo/types";

export function AskScreen() {
    const { colors } = useTheme();
    const [question, setQuestion] = useState("");
    const [answer, setAnswer] = useState<AskAnswer | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const speak = (text: string) => {
        Speech.stop();
        Speech.speak(text.slice(0, Speech.maxSpeechInputLength), { language: "en-US" });
    };

    const submit = async () => {
        const q = question.trim();
        if (!q || loading) return;
        setLoading(true);
        setError(null);
        try {
            const result = await askQuestion(q);
            setAnswer(result);
            speak(result.answer);
        } catch {
            setError("Could not reach the server. Try again.");
        } finally {
            setLoading(false);
        }
    };

    const lastSeen = answer?.last_seen_at ? new Date(answer.last_seen_at).toLocaleString() : null;

    return (
        <ScreenContainer scroll>
            <View style={styles.gap}>
                <Text variant="display">Ask Second Memory</Text>
                <Text color="mutedForeground">
                    {"Where did I park? Where are my keys? Ask in words."}
                </Text>
                <TextInput
                    value={question}
                    onChangeText={setQuestion}
                    placeholder="Type your question…"
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.input, {
                        borderColor: colors.border,
                        color: colors.foreground,
                        backgroundColor: colors.card,
                    }]}
                    onSubmitEditing={() => void submit()}
                    returnKeyType="send"
                    autoCorrect
                />
                <Button
                    label={loading ? "Thinking…" : "Ask"}
                    size="lg"
                    fullWidth
                    loading={loading}
                    disabled={question.trim().length === 0}
                    onPress={() => void submit()}
                />
                {error ? (
                    <Text color="destructive">{error}</Text>
                ) : null}
                {answer ? (
                    <Card>
                        <View style={styles.answer}>
                            <Text variant="micro" color="mutedForeground">
                                {answer.known ? "ANSWER" : "NO MEMORY"}
                            </Text>
                            <Text variant="bodyMedium">{answer.answer}</Text>
                            {lastSeen ? (
                                <Text color="mutedForeground" variant="caption">
                                    {`Last seen ${lastSeen}${answer.usually_here ? " · usually there" : ""}`}
                                </Text>
                            ) : null}
                            <Button
                                label="Speak again"
                                variant="ghost"
                                icon={<Volume2 size={18} color={colors.primary} />}
                                onPress={() => speak(answer.answer)}
                            />
                        </View>
                    </Card>
                ) : null}
                {loading ? <ActivityIndicator /> : null}
            </View>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    gap: { gap: spacing.md },
    input: {
        minHeight: 48,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
    },
    answer: { gap: spacing.sm },
});
