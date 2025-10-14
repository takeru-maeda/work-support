"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { DatePicker } from "@/components/ui/date-picker"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Plus, Trash2, Send, Check, ChevronsUpDown, GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"

interface EffortEntry {
  id: string
  project: string
  task: string
  estimatedHours: number
  actualHours: number
}

interface FormData {
  date: Date
  entries: EffortEntry[]
  memo: string
}

const STORAGE_KEY = "work-support-effort"

// Sample existing projects and tasks for autocomplete
const existingProjects = ["プロジェクトA", "プロジェクトB", "プロジェクトC", "新規開発案件", "保守運用"]

const existingTasks = ["要件定義", "設計", "実装", "テスト", "レビュー", "ミーティング", "ドキュメント作成"]

function calculateDifference(estimated: number, actual: number) {
  return actual - estimated
}

export function EffortForm() {
  const [formData, setFormData] = useState<FormData>({
    date: new Date(),
    entries: [],
    memo: "",
  })

  // Load from LocalStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setFormData({
          ...parsed,
          date: new Date(parsed.date),
        })
      } catch (error) {
        console.error("Failed to load saved data:", error)
      }
    }
  }, [])

  // Save to LocalStorage whenever formData changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(formData))
  }, [formData])

  const addEntry = () => {
    const newEntry: EffortEntry = {
      id: Date.now().toString(),
      project: "",
      task: "",
      estimatedHours: 0,
      actualHours: 0,
    }
    setFormData({
      ...formData,
      entries: [...formData.entries, newEntry],
    })
  }

  const removeEntry = (id: string) => {
    setFormData({
      ...formData,
      entries: formData.entries.filter((entry) => entry.id !== id),
    })
  }

  const updateEntry = (id: string, field: keyof EffortEntry, value: string | number) => {
    setFormData({
      ...formData,
      entries: formData.entries.map((entry) => (entry.id === id ? { ...entry, [field]: value } : entry)),
    })
  }

  const getTotalEstimated = () => {
    return formData.entries.reduce((sum, entry) => sum + entry.estimatedHours, 0)
  }

  const getTotalActual = () => {
    return formData.entries.reduce((sum, entry) => sum + entry.actualHours, 0)
  }

  const handleSubmit = () => {
    // Here you would typically send the data to a server
    console.log("Submitting:", formData)

    // Reset form and clear LocalStorage
    setFormData({
      date: new Date(),
      entries: [],
      memo: "",
    })
    localStorage.removeItem(STORAGE_KEY)

    alert("工数を送信しました")
  }

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newEntries = [...formData.entries]
    const draggedItem = newEntries[draggedIndex]
    newEntries.splice(draggedIndex, 1)
    newEntries.splice(index, 0, draggedItem)

    setFormData({ ...formData, entries: newEntries })
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const getProjectBreakdown = () => {
    const projectMap = new Map<string, { estimated: number; actual: number }>()

    formData.entries.forEach((entry) => {
      if (!entry.project) return

      const existing = projectMap.get(entry.project) || {
        estimated: 0,
        actual: 0,
      }
      projectMap.set(entry.project, {
        estimated: existing.estimated + entry.estimatedHours,
        actual: existing.actual + entry.actualHours,
      })
    })

    return Array.from(projectMap.entries()).map(([project, totals]) => ({
      project,
      estimated: totals.estimated,
      actual: totals.actual,
      difference: totals.actual - totals.estimated,
    }))
  }

  return (
    <div className="space-y-8">
      {/* Date Selection */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">日付</h2>
        <DatePicker
          date={formData.date}
          onDateChange={(date) => setFormData({ ...formData, date: date || new Date() })}
        />
      </div>

      {/* Time Entries */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">工数入力</h2>
        <div className="rounded-lg border border-border bg-card text-card-foreground shadow-sm p-4">
          <div className="space-y-4">
            {formData.entries.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">工数エントリーを追加してください</p>
            ) : (
              formData.entries.map((entry, index) => (
                <EffortRow
                  key={entry.id}
                  entry={entry}
                  index={index}
                  isDragging={draggedIndex === index}
                  onUpdate={updateEntry}
                  onRemove={removeEntry}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                />
              ))
            )}
            <Button variant="outline" size="sm" onClick={addEntry} className="w-full gap-2 bg-transparent">
              <Plus className="h-4 w-4" />
              工数エントリーを追加
            </Button>
          </div>
        </div>
      </div>

      {/* Time Summary */}
      {formData.entries.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">工数集計</h2>
          <div className="rounded-lg border border-border bg-card text-card-foreground shadow-sm p-4">
            <div className="space-y-6">
              {getProjectBreakdown().length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground">案件別集計</h3>
                  <div className="space-y-3">
                    {getProjectBreakdown().map((projectData) => (
                      <div
                        key={projectData.project}
                        className="flex flex-col sm:grid sm:grid-cols-4 gap-3 p-3 rounded-md bg-muted/50"
                      >
                        <div className="sm:col-span-1 font-medium truncate">{projectData.project}</div>
                        <div className="flex gap-3 sm:contents">
                          <div className="flex items-center gap-2 flex-1 sm:flex-none">
                            <span className="text-sm text-muted-foreground">見積:</span>
                            <span className="font-semibold">{projectData.estimated.toFixed(1)}h</span>
                          </div>
                          <div className="flex items-center gap-2 flex-1 sm:flex-none">
                            <span className="text-sm text-muted-foreground">実績:</span>
                            <span className="font-semibold">{projectData.actual.toFixed(1)}h</span>
                          </div>
                          <div className="flex items-center gap-2 flex-1 sm:flex-none">
                            <span className="text-sm text-muted-foreground">差分:</span>
                            <span className="font-semibold">{projectData.difference.toFixed(1)}h</span>
                            <DifferenceBadge difference={projectData.difference} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {getProjectBreakdown().length > 0 && <div className="border-t" />}

              {/* Overall totals */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-4">全体合計</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">見積もり合計</Label>
                    <p className="text-2xl font-bold">{getTotalEstimated().toFixed(1)}h</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">実績合計</Label>
                    <p className="text-2xl font-bold">{getTotalActual().toFixed(1)}h</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">差分</Label>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold">{(getTotalActual() - getTotalEstimated()).toFixed(1)}h</p>
                      <DifferenceBadge difference={getTotalActual() - getTotalEstimated()} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Memo */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">メモ</h2>
        <Textarea
          placeholder="作業内容や特記事項を入力してください..."
          value={formData.memo}
          onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
          rows={6}
          className="resize-y"
        />
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button onClick={handleSubmit} size="lg" disabled={formData.entries.length === 0}>
          <Send className="h-4 w-4 mr-2" />
          送信
        </Button>
      </div>
    </div>
  )
}

function EffortRow({
  entry,
  index,
  isDragging,
  onUpdate,
  onRemove,
  onDragStart,
  onDragOver,
  onDragEnd,
}: {
  entry: EffortEntry
  index: number
  isDragging: boolean
  onUpdate: (id: string, field: keyof EffortEntry, value: string | number) => void
  onRemove: (id: string) => void
  onDragStart: (index: number) => void
  onDragOver: (e: React.DragEvent, index: number) => void
  onDragEnd: () => void
}) {
  const difference = calculateDifference(entry.estimatedHours, entry.actualHours)

  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragEnd={onDragEnd}
      className={cn("border rounded-lg p-4 space-y-4 transition-opacity cursor-move", isDragging && "opacity-50")}
    >
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 pt-2 cursor-grab active:cursor-grabbing">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex-1 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Project Combobox */}
            <div>
              <ProjectCombobox value={entry.project} onChange={(value) => onUpdate(entry.id, "project", value)} />
            </div>

            {/* Task Combobox */}
            <div>
              <TaskCombobox value={entry.task} onChange={(value) => onUpdate(entry.id, "task", value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-end">
            {/* Estimated Hours */}
            <div>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={entry.estimatedHours || ""}
                onChange={(e) => onUpdate(entry.id, "estimatedHours", Number.parseFloat(e.target.value) || 0)}
                placeholder="見積工数(h)"
              />
            </div>

            {/* Actual Hours */}
            <div>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={entry.actualHours || ""}
                onChange={(e) => onUpdate(entry.id, "actualHours", Number.parseFloat(e.target.value) || 0)}
                placeholder="実績工数(h)"
              />
            </div>

            {/* Difference */}
            <div className="flex items-center gap-2 h-10">
              <span className="font-semibold">{difference.toFixed(1)}h</span>
              <DifferenceBadge difference={difference} />
            </div>

            {/* Delete Button */}
            <div className="ml-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(entry.id)}
                className="text-destructive hover:text-destructive h-10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProjectCombobox({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value)

  useEffect(() => {
    setInputValue(value)
  }, [value])

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue)
    setInputValue(selectedValue)
    setOpen(false)
  }

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue)
    onChange(newValue)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-transparent"
        >
          <span className={cn("truncate", !inputValue && "text-muted-foreground")}>
            {inputValue || "案件を選択..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="案件を検索または入力..." value={inputValue} onValueChange={handleInputChange} />
          <CommandList>
            <CommandEmpty>
              <div className="p-2">
                <Button variant="ghost" className="w-full justify-start" onClick={() => handleSelect(inputValue)}>
                  <Plus className="mr-2 h-4 w-4" />
                  &quot;{inputValue}&quot; を追加
                </Button>
              </div>
            </CommandEmpty>
            <CommandGroup>
              {existingProjects.map((project) => (
                <CommandItem key={project} value={project} onSelect={() => handleSelect(project)}>
                  <Check className={cn("mr-2 h-4 w-4", value === project ? "opacity-100" : "opacity-0")} />
                  {project}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function TaskCombobox({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value)

  useEffect(() => {
    setInputValue(value)
  }, [value])

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue)
    setInputValue(selectedValue)
    setOpen(false)
  }

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue)
    onChange(newValue)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-transparent"
        >
          <span className={cn("truncate", !inputValue && "text-muted-foreground")}>
            {inputValue || "タスクを選択..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="タスクを検索または入力..." value={inputValue} onValueChange={handleInputChange} />
          <CommandList>
            <CommandEmpty>
              <div className="p-2">
                <Button variant="ghost" className="w-full justify-start" onClick={() => handleSelect(inputValue)}>
                  <Plus className="mr-2 h-4 w-4" />
                  &quot;{inputValue}&quot; を追加
                </Button>
              </div>
            </CommandEmpty>
            <CommandGroup>
              {existingTasks.map((task) => (
                <CommandItem key={task} value={task} onSelect={() => handleSelect(task)}>
                  <Check className={cn("mr-2 h-4 w-4", value === task ? "opacity-100" : "opacity-0")} />
                  {task}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function DifferenceBadge({ difference }: { difference: number }) {
  if (difference === 0) {
    return <Badge variant="secondary">±0</Badge>
  } else if (difference > 0) {
    return <Badge variant="destructive">+{difference.toFixed(1)}</Badge>
  } else {
    return <Badge className="bg-green-500 hover:bg-green-600">{difference.toFixed(1)}</Badge>
  }
}
