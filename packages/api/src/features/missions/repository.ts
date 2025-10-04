import { SupabaseClient } from '@supabase/supabase-js';
import {
  Database,
  Tables,
  TablesInsert,
} from '../../../../shared/src/types/db';
import { AppError } from '../../lib/errors';

export const getMission = async (
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<Tables<'missions'> | null> => {
  const { data, error } = await supabase
    .from('missions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new AppError(500, `Failed to fetch mission: ${error.message}`, error);
  }
  return data;
};

export const upsertMission = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  content: string,
): Promise<Tables<'missions'>> => {
  const body: TablesInsert<'missions'> = {
    user_id: userId,
    content: content,
    updated_at: new Date().toISOString(),
  };
  const { data: updated, error: updateError } = await supabase
    .from('missions')
    .update(body)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();

  if (updateError) {
    const message = `Failed to update mission: ${updateError.message}`;
    throw new AppError(500, message, updateError);
  }

  if (updated) return updated;

  const { data: inserted, error: insertError } = await supabase
    .from('missions')
    .insert(body)
    .select('*')
    .single();

  if (insertError) {
    const message = `Failed to save mission: ${insertError.message}`;
    throw new AppError(500, message, insertError);
  }

  return inserted;
};
