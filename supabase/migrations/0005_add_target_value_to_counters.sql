-- Migration to add target_value to counters table
ALTER TABLE counters 
ADD COLUMN target_value integer DEFAULT NULL;
