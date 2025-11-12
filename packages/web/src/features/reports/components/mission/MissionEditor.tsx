import { Edit2 } from "lucide-react";
import { updateMission, useMission } from "@/services/missions";
import { useEffect, useState } from "react";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { FormActions } from "@/components/form/FormActions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import CardContainer from "@/components/shared/CardContainer";
import { reportUiError } from "@/services/logs";
import MissionSectionHeader from "./MissionSectionHeader";
import { Skeleton } from "@/components/ui/skeleton";
import type { Mission } from "../../types";

interface MissionEditorProps {
  saving: boolean;
  setSaving: React.Dispatch<React.SetStateAction<boolean>>;
}

export function MissionEditor({
  saving,
  setSaving,
}: Readonly<MissionEditorProps>) {
  const { data, isLoading, error, mutate } = useMission();
  const mission: Mission | null = data?.mission ?? null;
  const [tempMission, setTempMission] = useState<string>("");
  const [isEditing, setIsEditing] = useState<boolean>(false);

  useEffect(() => {
    if (!isEditing) {
      setTempMission(mission?.content ?? "");
    }
  }, [mission?.content, isEditing]);

  const handleEdit = () => {
    setTempMission(mission?.content ?? "");
    setIsEditing(true);
  };

  const handleCancel = () => {
    setTempMission(mission?.content ?? "");
    setIsEditing(false);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateMission(tempMission.trim());
      setIsEditing(false);
      showSuccessToast("ミッションを更新しました");
    } catch (err) {
      showErrorToast("ミッションの更新に失敗しました");
      reportUiError(err);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <CardContainer className="space-y-4">
        <MissionSectionHeader />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      </CardContainer>
    );
  }

  return (
    <CardContainer className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <MissionSectionHeader />
        {!isEditing && !error && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleEdit}
            className="w-full gap-2 sm:w-auto"
          >
            <Edit2 className="h-4 w-4" />
            編集
          </Button>
        )}
      </div>
      {error ? (
        <div className="space-y-4">
          <p className="text-sm text-destructive-foreground">
            {error instanceof Error
              ? error.message
              : "ミッションの取得に失敗しました"}
          </p>
          <Button onClick={() => void mutate()} variant="outline" size="sm">
            再読み込み
          </Button>
        </div>
      ) : isEditing ? (
        <div className="space-y-2 sm:space-y-4">
          <Textarea
            value={tempMission}
            onChange={(event) => setTempMission(event.target.value)}
            className="min-h-[120px] resize-y bg-background text-foreground"
            placeholder="ミッションを入力してください..."
          />
          <FormActions
            onCancel={handleCancel}
            onSave={handleSave}
            saveDisabled={
              tempMission.trim().length === 0 ||
              saving ||
              tempMission.trim() === (mission?.content ?? "")
            }
            saveLabel={saving ? "保存中..." : "保存"}
          />
        </div>
      ) : (
        <p
          className={`whitespace-pre-line text-pretty leading-relaxed mb-2 ${mission ? "text-foreground" : "text-muted-foreground"}`}
        >
          {mission?.content ?? "まだミッションが設定されていません。"}
        </p>
      )}
    </CardContainer>
  );
}
