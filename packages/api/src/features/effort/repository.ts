import { TablesInsert, Database } from '../../../../shared/src/types/db';
import { AppError } from '../../lib/errors';
import { SupabaseClient } from '@supabase/supabase-js';
import { ParsedEffort } from './types';
import { Dayjs } from 'dayjs';

export async function findProject(
  supabase: SupabaseClient<Database>,
  userId: string,
  effort: ParsedEffort,
): Promise<number> {
  const { data: pj, error } = await supabase
    .from('projects')
    .select('id')
    .eq('user_id', userId)
    .eq('name', effort.project_name)
    .maybeSingle();

  if (error) {
    throw new AppError(500, `Failed to fetch project: ${error.message}`, error);
  }

  if (!pj) {
    const { data: newPj, error: insertError } = await supabase
      .from('projects')
      .insert({
        user_id: userId,
        name: effort.project_name,
      })
      .select('id')
      .single();

    if (insertError) {
      const message = `Failed to create project: ${insertError.message}`;
      throw new AppError(500, message, insertError);
    }
    return newPj.id;
  }

  return pj.id;
}

export async function findOrCreateTask(
  supabase: SupabaseClient<Database>,
  projectId: number,
  taskName: string,
): Promise<number> {
  let { data: task, error } = await supabase
    .from('tasks')
    .select('id')
    .eq('project_id', projectId)
    .eq('name', taskName)
    .maybeSingle();

  if (error) {
    throw new AppError(500, `Failed to fetch task: ${error.message}`, error);
  }

  if (!task) {
    const { data: newTask, error: insertError } = await supabase
      .from('tasks')
      .insert({
        project_id: projectId,
        name: taskName,
      })
      .select('id')
      .single();

    if (insertError) {
      const message = `Failed to create task: ${insertError.message}`;
      throw new AppError(500, message, insertError);
    }
    return newTask.id;
  }

  return task.id;
}

export async function insertWorkRecord(
  supabase: SupabaseClient<Database>,
  userId: string,
  taskId: number,
  workDate: Date | Dayjs,
  effort: ParsedEffort,
): Promise<void> {
  const workRecord: TablesInsert<'work_records'> = {
    user_id: userId,
    task_id: taskId,
    work_date: workDate.toISOString(),
    hours: effort.hours || 0, // Default to 0 if null
    estimated_hours: effort.estimated_hours,
  };

  const { error } = await supabase.from('work_records').insert(workRecord);

  if (error) {
    const message = `Failed to save work record* ${error.message}`;
    throw new AppError(500, message, error);
  }
}
