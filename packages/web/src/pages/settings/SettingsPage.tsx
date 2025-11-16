import { useEffect, useState } from "react";
import { Bell } from "lucide-react";

import { PageLayout } from "@/components/layout/PageLayout";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { reportUiError } from "@/services/logs";
import { updateUserSettings } from "@/services/userSettings";
import { shallow } from "zustand/shallow";
import { SettingsCard } from "./components/SettingsCard";
import type { UserSettings } from "@shared/schemas/userSettings";
import { useUserSettingsStore } from "@/store/userSettings";

export default function SettingsPage() {
  const { settings, initialized, setSettings } = useUserSettingsStore(
    (state) => ({
      settings: state.settings,
      initialized: state.initialized,
      setSettings: state.setSettings,
    }),
    shallow,
  );
  const [emailNotification, setEmailNotification] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setEmailNotification(settings.notify_effort_email);
      setErrorMessage(null);
      return;
    }
    if (initialized && !settings) {
      setErrorMessage(
        "設定の取得に失敗しました。時間を空けて再度お試しください。",
      );
    }
  }, [initialized, settings]);

  const handleToggle = async (checked: boolean) => {
    setErrorMessage(null);
    const previousValue: boolean = emailNotification;
    setEmailNotification(checked);
    setIsSaving(true);

    try {
      const updated: UserSettings = await updateUserSettings(checked);
      setSettings(updated);
    } catch (error) {
      setEmailNotification(previousValue);
      setErrorMessage(
        "設定の更新に失敗しました。時間を空けて再度お試しください。",
      );
      await reportUiError(error, {
        message: "Failed to update user settings",
        clientContext: { desiredValue: checked },
      });
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading: boolean = !initialized;
  const disabled: boolean = isLoading || isSaving || !settings;

  return (
    <PageLayout pageTitle="設定" pageDescription="アプリケーションの設定を管理">
      <div className="grid w-full gap-4 sm:gap-6">
        <SettingsCard icon={Bell} label="通知設定">
          <div className="flex items-center justify-between border-b border-border last:border-0">
            <div className="space-y-1">
              <Label
                htmlFor="email-notification"
                className="cursor-pointer text-sm font-medium sm:text-base"
              >
                工数登録時のメール通知
              </Label>
              <p className="text-xs text-muted-foreground sm:text-sm">
                工数登録時、登録内容をメールで通知します
              </p>
              {errorMessage && (
                <p className="text-xs text-destructive-foreground sm:text-sm">
                  {errorMessage}
                </p>
              )}
            </div>
            <Switch
              id="email-notification"
              checked={emailNotification}
              onCheckedChange={handleToggle}
              disabled={disabled}
            />
          </div>
        </SettingsCard>
      </div>
    </PageLayout>
  );
}
