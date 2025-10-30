import { Edit2, Target } from "lucide-react";
import { useMission } from "@/features/reports/hooks/useMission";
import { useEffect, useState } from "react";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { FormActions } from "@/components/form/FormActions";
import { SectionHeader } from "@/components/sections/SectionHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import CardContainer from "@/components/shared/CardContainer";
import { CardSkeleton } from "@/components/skeleton/CardSkeleton";

interface MissionEditorProps {
  saving: boolean;
  setSaving: React.Dispatch<React.SetStateAction<boolean>>;
}

export function MissionEditor({
  saving,
  setSaving,
}: Readonly<MissionEditorProps>) {
  const { mission, isLoading, error, updateMission, reload } = useMission();
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
      console.error(err);
      showErrorToast("ミッションの更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return <CardSkeleton />;
  }

  return (
    <CardContainer className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SectionHeader
          icon={Target}
          iconClassName="bg-primary/10 text-primary"
          title="ミッション"
          description="目的と方向性を定義"
        />
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
          <p className="text-sm text-destructive">
            {error instanceof Error
              ? error.message
              : "ミッションの取得に失敗しました"}
          </p>
          <Button onClick={() => void reload()} variant="outline" size="sm">
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
        <p className="whitespace-pre-line text-pretty leading-relaxed text-foreground mb-2">
          {mission?.content ?? "まだミッションが設定されていません。"}
        </p>
      )}
    </CardContainer>
  );
}
