-- Feature 2: Data model (PLAN.md §3)
-- Run after 001_users.sql. Every table has Row Level Security (RLS): the
-- database itself checks that each user only reads and changes their own rows.

---------------------------------------------------------------------------
-- Lookup lists (same for everyone, read-only)
---------------------------------------------------------------------------

create table public.goals (
  id serial primary key,
  name text not null unique
);

create table public.allergies (
  id serial primary key,
  name text not null unique
);

create table public.appliances (
  id serial primary key,
  name text not null unique
);

insert into public.goals (name) values
  ('Save money'),
  ('Save time'),
  ('Eat healthier'),
  ('Eat more protein'),
  ('Improve cooking skills');

-- The 9 major food allergens in the US.
insert into public.allergies (name) values
  ('Milk'), ('Eggs'), ('Fish'), ('Shellfish'), ('Tree nuts'),
  ('Peanuts'), ('Wheat'), ('Soy'), ('Sesame');

insert into public.appliances (name) values
  ('Stove'), ('Oven'), ('Microwave'), ('Air fryer');

---------------------------------------------------------------------------
-- Profiles (one per user, filled in by the onboarding questionnaire)
---------------------------------------------------------------------------

create table public.profiles (
  id serial primary key,
  user_id uuid not null unique references public.users (id) on delete cascade,
  diet_type text not null default 'none'
    check (diet_type in ('none', 'vegetarian', 'vegan', 'pescatarian')),
  budget_bracket text check (budget_bracket in ('$', '$$', '$$$')),
  onboarding_completed boolean not null default false,
  start_preference text check (start_preference in ('meal prep', 'single recipe'))
);

create table public.user_goals (
  user_id uuid not null references public.users (id) on delete cascade,
  goal_id int not null references public.goals (id) on delete cascade,
  primary key (user_id, goal_id)
);

create table public.user_allergies (
  user_id uuid not null references public.users (id) on delete cascade,
  allergy_id int not null references public.allergies (id) on delete cascade,
  primary key (user_id, allergy_id)
);

create table public.user_appliances (
  user_id uuid not null references public.users (id) on delete cascade,
  appliance_id int not null references public.appliances (id) on delete cascade,
  primary key (user_id, appliance_id)
);

---------------------------------------------------------------------------
-- Ingredients and recipes
---------------------------------------------------------------------------

create table public.ingredients (
  id serial primary key,
  name text not null,
  category text,
  is_staple boolean not null default false, -- spices, olive oil, butter
  is_custom boolean not null default false,
  created_by_user_id uuid references public.users (id) on delete cascade
);

-- One shared ingredient per name; custom ones are unique per user.
create unique index ingredients_shared_name on public.ingredients (lower(name))
  where created_by_user_id is null;
create unique index ingredients_custom_name on public.ingredients (created_by_user_id, lower(name))
  where created_by_user_id is not null;

create table public.user_dislikes (
  user_id uuid not null references public.users (id) on delete cascade,
  ingredient_id int not null references public.ingredients (id) on delete cascade,
  primary key (user_id, ingredient_id)
);

create table public.recipes (
  id serial primary key,
  title text not null,
  cuisine text,
  instructions text not null,
  prep_minutes int check (prep_minutes >= 0),
  cook_minutes int check (cook_minutes >= 0),
  base_servings int not null check (base_servings > 0),
  cost_bracket text check (cost_bracket in ('$', '$$', '$$$')),
  diet_tags text[] not null default '{}',
  source_type text not null default 'user'
    check (source_type in ('seed', 'user', 'instagram')),
  source_url text,
  image_url text,
  image_credit text,
  created_by_user_id uuid references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- Seed recipes have no owner; everything else must have one.
  check ((source_type = 'seed') = (created_by_user_id is null))
);

create index recipes_created_by on public.recipes (created_by_user_id);

create table public.recipe_ingredients (
  recipe_id int not null references public.recipes (id) on delete cascade,
  ingredient_id int not null references public.ingredients (id) on delete restrict,
  quantity numeric check (quantity > 0),
  unit text,
  primary key (recipe_id, ingredient_id)
);

create table public.recipe_allergen_tags (
  recipe_id int not null references public.recipes (id) on delete cascade,
  allergy_id int not null references public.allergies (id) on delete cascade,
  primary key (recipe_id, allergy_id)
);

create table public.recipe_appliances (
  recipe_id int not null references public.recipes (id) on delete cascade,
  appliance_id int not null references public.appliances (id) on delete cascade,
  primary key (recipe_id, appliance_id)
);

---------------------------------------------------------------------------
-- Stars (one junction table for everyone)
---------------------------------------------------------------------------

create table public.stars (
  id serial primary key,
  user_id uuid not null references public.users (id) on delete cascade,
  recipe_id int not null references public.recipes (id) on delete cascade,
  starred_at timestamptz not null default now(),
  unique (user_id, recipe_id) -- a user can't star the same recipe twice
);

---------------------------------------------------------------------------
-- Meal plans
---------------------------------------------------------------------------

create table public.meal_plans (
  id serial primary key,
  user_id uuid not null references public.users (id) on delete cascade,
  servings_per_meal int not null check (servings_per_meal > 0),
  days int not null check (days between 1 and 7),
  time_available_minutes int check (time_available_minutes > 0),
  budget_bracket text check (budget_bracket in ('$', '$$', '$$$')),
  created_at timestamptz not null default now()
);

create table public.meal_plan_items (
  id serial primary key,
  meal_plan_id int not null references public.meal_plans (id) on delete cascade,
  recipe_id int not null references public.recipes (id) on delete cascade,
  day_number int not null check (day_number between 1 and 7)
);

create index meal_plans_user on public.meal_plans (user_id);
create index meal_plan_items_plan on public.meal_plan_items (meal_plan_id);

---------------------------------------------------------------------------
-- Rules enforced by the database
---------------------------------------------------------------------------

-- Maximum 3 goals per user (PLAN.md §2).
create function public.check_max_goals()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.user_goals where user_id = new.user_id) >= 3 then
    raise exception 'You can choose up to 3 goals.';
  end if;
  return new;
end;
$$;

create trigger max_three_goals
  before insert on public.user_goals
  for each row execute function public.check_max_goals();

-- New sign ups now also get an empty profile (replaces the 001 version).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, email) values (new.id, new.email);
  insert into public.profiles (user_id) values (new.id);
  return new;
end;
$$;

-- Accounts created before this migration get their profile now.
insert into public.profiles (user_id)
select id from public.users
on conflict (user_id) do nothing;

---------------------------------------------------------------------------
-- Row Level Security
---------------------------------------------------------------------------

alter table public.goals enable row level security;
alter table public.allergies enable row level security;
alter table public.appliances enable row level security;
alter table public.profiles enable row level security;
alter table public.user_goals enable row level security;
alter table public.user_allergies enable row level security;
alter table public.user_appliances enable row level security;
alter table public.ingredients enable row level security;
alter table public.user_dislikes enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_allergen_tags enable row level security;
alter table public.recipe_appliances enable row level security;
alter table public.stars enable row level security;
alter table public.meal_plans enable row level security;
alter table public.meal_plan_items enable row level security;

-- Lookup lists: any logged-in user can read them.
create policy "Read goals" on public.goals for select to authenticated using (true);
create policy "Read allergies" on public.allergies for select to authenticated using (true);
create policy "Read appliances" on public.appliances for select to authenticated using (true);

-- Tables that belong to one user: only that user can read or change them.
create policy "Own profile" on public.profiles for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Own goals" on public.user_goals for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Own allergies" on public.user_allergies for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Own appliances" on public.user_appliances for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Own dislikes" on public.user_dislikes for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Own meal plans" on public.meal_plans for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Ingredients: shared ones are readable by all; custom ones only by their creator.
create policy "Read shared or own ingredients" on public.ingredients for select to authenticated
  using (created_by_user_id is null or created_by_user_id = (select auth.uid()));
create policy "Add own custom ingredients" on public.ingredients for insert to authenticated
  with check (created_by_user_id = (select auth.uid()) and is_custom);

-- Recipes: seed recipes are shared read-only; user recipes are private.
create policy "Read seed or own recipes" on public.recipes for select to authenticated
  using (created_by_user_id is null or created_by_user_id = (select auth.uid()));
create policy "Add own recipes" on public.recipes for insert to authenticated
  with check (created_by_user_id = (select auth.uid()));
create policy "Edit own recipes" on public.recipes for update to authenticated
  using (created_by_user_id = (select auth.uid()))
  with check (created_by_user_id = (select auth.uid()));
create policy "Delete own recipes" on public.recipes for delete to authenticated
  using (created_by_user_id = (select auth.uid()));

-- Recipe detail tables follow their recipe: readable if the recipe is
-- readable, changeable only if the recipe is yours.
create function public.can_read_recipe(rid int)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (select 1 from public.recipes r
                 where r.id = rid
                   and (r.created_by_user_id is null or r.created_by_user_id = (select auth.uid())));
$$;

create function public.owns_recipe(rid int)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (select 1 from public.recipes r
                 where r.id = rid and r.created_by_user_id = (select auth.uid()));
$$;

-- Stars and meal plan items may only point at recipes the user can see.
create policy "Own stars" on public.stars for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and public.can_read_recipe(recipe_id));

create policy "Own meal plan items" on public.meal_plan_items for all to authenticated
  using (exists (select 1 from public.meal_plans m
                 where m.id = meal_plan_id and m.user_id = (select auth.uid())))
  with check (exists (select 1 from public.meal_plans m
                      where m.id = meal_plan_id and m.user_id = (select auth.uid()))
              and public.can_read_recipe(recipe_id));

create policy "Read recipe ingredients" on public.recipe_ingredients for select to authenticated
  using (public.can_read_recipe(recipe_id));
create policy "Change own recipe ingredients" on public.recipe_ingredients for all to authenticated
  using (public.owns_recipe(recipe_id)) with check (public.owns_recipe(recipe_id));

create policy "Read recipe allergens" on public.recipe_allergen_tags for select to authenticated
  using (public.can_read_recipe(recipe_id));
create policy "Change own recipe allergens" on public.recipe_allergen_tags for all to authenticated
  using (public.owns_recipe(recipe_id)) with check (public.owns_recipe(recipe_id));

create policy "Read recipe appliances" on public.recipe_appliances for select to authenticated
  using (public.can_read_recipe(recipe_id));
create policy "Change own recipe appliances" on public.recipe_appliances for all to authenticated
  using (public.owns_recipe(recipe_id)) with check (public.owns_recipe(recipe_id));
