import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { PageLayout } from "@/components/layout/PageLayout";
import { Label } from "@/components/ui/label";
import { SettingsCard } from "./components/SettingsCard";

export default function SettingsPage() {
  const [emailNotification, setEmailNotification] = useState(false);

  useEffect(() => {
    const savedSettings = localStorage.getItem("appSettings");
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setEmailNotification(settings.emailNotification || false);
    }
  }, []);

  const handleToggle = (checked: boolean) => {
    setEmailNotification(checked);

    const settings = {
      emailNotification: checked,
    };
    localStorage.setItem("appSettings", JSON.stringify(settings));
  };

  return (
    <PageLayout pageTitle="設定" pageDescription="アプリケーションの設定を管理">
      <div className="grid gap-4 sm:gap-6 w-full">
        <SettingsCard icon={Bell} label="通知設定">
          <div className="flex items-center justify-between border-b border-border last:border-0">
            <div className="space-y-1">
              <Label
                htmlFor="email-notification"
                className="text-sm sm:text-base font-medium cursor-pointer"
              >
                工数登録時のメール通知
              </Label>
              <p className="text-xs sm:text-sm text-muted-foreground">
                工数登録時、登録内容をメールで通知します
              </p>
            </div>
            <Switch
              id="email-notification"
              checked={emailNotification}
              onCheckedChange={handleToggle}
            />
          </div>
        </SettingsCard>
      </div>
    </PageLayout>
  );
}
