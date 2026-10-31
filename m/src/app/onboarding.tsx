import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { OnboardingScreen } from "@/features/onboarding/OnboardingScreen";
export default function Route() {
    return (<ScreenContainer scroll>
      <OnboardingScreen />
    </ScreenContainer>);
}
