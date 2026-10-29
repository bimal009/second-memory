import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { PermissionsScreen } from "@/features/onboarding/PermissionsScreen";
export default function Route() {
  return (
    <ScreenContainer scroll>
      <PermissionsScreen />
    </ScreenContainer>
  );
}
