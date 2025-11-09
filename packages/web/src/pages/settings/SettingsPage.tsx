import { useEffect, useState } from "react";
import { Bell } from "lucide-react";

import { PageLayout } from "@/components/layout/PageLayout";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { reportUiError } from "@/services/logs";
import {
  createUserSettings,
  getUserSettings,
  updateUserSettings,
} from "@/services/userSettings";
import { SettingsCard } from "./components/SettingsCard";
import type { UserSettings } from "@shared/schemas/userSettings";

export default function SettingsPage() {
  const [emailNotification, setEmailNotification] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settings: UserSettings | null = await getUserSettings();
        if (settings) {
          setEmailNotification(settings.notify_effort_email);
        } else {
          const created: UserSettings = await createUserSettings();
          setEmailNotification(created.notify_effort_email);
        }
      } catch (error) {
        setErrorMessage(
          "設定の取得に失敗しました。時間を空けて再度お試しください。",
        );
        await reportUiError(error, {
          message: "Failed to fetch user settings",
        });
      } finally {
        setIsLoading(false);
      }
    };

    void fetchSettings();
  }, []);

  const handleToggle = async (checked: boolean) => {
    setErrorMessage(null);
    const previousValue: boolean = emailNotification;
    setEmailNotification(checked);
    setIsSaving(true);

    try {
      await updateUserSettings(checked);
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
                <p className="text-xs text-destructive sm:text-sm">
                  {errorMessage}
                </p>
              )}
            </div>
            <Switch
              id="email-notification"
              checked={emailNotification}
              onCheckedChange={handleToggle}
              disabled={isLoading || isSaving}
            />
          </div>
        </SettingsCard>
      </div>
    </PageLayout>
  );
}
