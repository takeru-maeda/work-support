import { SupabaseClient } from '@supabase/supabase-js';
import { Database, Tables } from '../../../../shared/src/types/db';
import { getMission, upsertMission } from './repository';

export const getMissionService = async (
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<Tables<'missions'> | null> => {
  return await getMission(supabase, userId);
};

export const upsertMissionService = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  content: string,
): Promise<Tables<'missions'>> => {
  return await upsertMission(supabase, userId, content);
};
