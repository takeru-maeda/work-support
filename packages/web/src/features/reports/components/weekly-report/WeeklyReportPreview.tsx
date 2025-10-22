import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Check, Copy } from "lucide-react";

interface WeeklyReportPreviewProps {
  reportText: string;
  copied: boolean;
  onCopy: () => void;
}

export function WeeklyReportPreview({
  reportText,
  copied,
  onCopy,
}: Readonly<WeeklyReportPreviewProps>) {
  return (
    <CardContent className="space-y-4">
      <div className="relative">
        <div className="absolute right-2 top-2 z-10">
          <Button
            size="sm"
            variant="ghost"
            onClick={onCopy}
            className="h-8 gap-2 bg-muted/50 hover:bg-muted"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                コピー済み
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                コピー
              </>
            )}
          </Button>
        </div>
        <div className="max-h-[600px] overflow-auto rounded-lg border border-border bg-muted/30 p-4 font-mono text-sm">
          <pre className="whitespace-pre-wrap leading-relaxed text-foreground">
            {reportText}
          </pre>
        </div>
      </div>
    </CardContent>
  );
}
