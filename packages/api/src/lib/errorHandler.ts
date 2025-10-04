import { Context } from 'hono';
import { AppError } from './errors';
import { Database, Tables, TablesInsert } from '../../../shared/src/types/db';
import { HonoEnv } from '../custom-types';
import { ContentfulStatusCode } from 'hono/utils/http-status';
import { createSupabaseClient } from './supabase';
import { SupabaseClient } from '@supabase/supabase-js';
import { updateAccessLog } from '../middleware/logger';

export const globalErrorHandler = async (err: Error, c: Context<HonoEnv>) => {
  const accessLog: Tables<'access_logs'> = c.get('accessLog');
  const supabase: SupabaseClient<Database> = createSupabaseClient(c.env);

  let statusCode: ContentfulStatusCode = 500;
  let message: string = 'Internal Server Error';
  let dbMessage: string = message;
  let logLevel: 'ERROR' | 'CRITICAL' = 'ERROR';

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    logLevel = err.logLevel;
    dbMessage = err.internalError ? err.internalError.message : message;
  }

  const errorLog: TablesInsert<'error_logs'> = {
    access_log_id: accessLog.id,
    level: logLevel,
    message: dbMessage,
    stack_trace: err.stack,
  };

  const handleErrorOnBackground: Promise<void> = (async () => {
    await supabase.from('error_logs').insert(errorLog);
    await updateAccessLog(c);
  })();

  c.executionCtx.waitUntil(handleErrorOnBackground);

  return c.json(
    {
      error: message,
      accessLogId: accessLog.id,
    },
    statusCode,
  );
};
