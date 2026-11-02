-- 005: remove the "Eat more protein" goal (my decision, reality log #18).
-- Anyone who had picked it just loses that goal (user_goals rows are
-- deleted with it). Safe to run more than once.

delete from public.goals where name = 'Eat more protein';
