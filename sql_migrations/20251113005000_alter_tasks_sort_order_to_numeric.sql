-- Alter tasks.sort_order from integer to numeric for fractional ranking
BEGIN;

ALTER TABLE public.tasks
  ALTER COLUMN sort_order TYPE numeric USING sort_order::numeric;

-- Recreate index to ensure compatibility after type change
DROP INDEX IF EXISTS idx_tasks_sort_order;
CREATE INDEX IF NOT EXISTS idx_tasks_sort_order ON public.tasks USING btree (sort_order);

COMMIT;
