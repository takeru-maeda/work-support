"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Target, Save, Edit2 } from "lucide-react"

export function MissionEditor() {
  const [mission, setMission] = useState(
    "Drive innovation and excellence in product development while fostering a collaborative team environment that empowers every member to achieve their full potential.",
  )
  const [isEditing, setIsEditing] = useState(false)
  const [tempMission, setTempMission] = useState(mission)

  const handleSave = () => {
    setMission(tempMission)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setTempMission(mission)
    setIsEditing(false)
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-card-foreground">ミッション</CardTitle>
              <CardDescription>目的と方向性を定義</CardDescription>
            </div>
          </div>
          {!isEditing && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="gap-2 w-full sm:w-auto">
              <Edit2 className="h-4 w-4" />
              編集
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-4">
            <Textarea
              value={tempMission}
              onChange={(e) => setTempMission(e.target.value)}
              className="min-h-[120px] resize-none bg-background text-foreground"
              placeholder="ミッションを入力してください..."
            />
            <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
              <Button variant="outline" size="sm" onClick={handleCancel} className="w-full sm:w-auto bg-transparent">
                キャンセル
              </Button>
              <Button size="sm" onClick={handleSave} className="gap-2 w-full sm:w-auto">
                <Save className="h-4 w-4" />
                保存
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-foreground leading-relaxed text-pretty whitespace-pre-line">{mission}</p>
        )}
      </CardContent>
    </Card>
  )
}
