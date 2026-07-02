-- Allow a co-post to exist once per grid it appears on.
--
-- Instagram co-authored posts share ONE post_id but appear on BOTH partners'
-- grids. The old unique(post_id) forced last-write-wins, so a collab between
-- two tracked hotels landed under only one of them. Switching to a composite
-- unique (post_id, instagram_handle) stores the post once per hotel, so each
-- is measured against its own baseline.
--
-- Safe on current data (every post_id is already unique). Reversible: drop the
-- composite and re-add `unique (post_id)`.
--
-- Run in the Supabase SQL editor.

-- Drop whatever single-column unique constraint exists on post_id
do $$
declare c text;
begin
  select conname into c
  from pg_constraint
  where conrelid = 'public.posts'::regclass
    and contype = 'u'
    and array_length(conkey, 1) = 1
    and conkey[1] = (
      select attnum from pg_attribute
      where attrelid = 'public.posts'::regclass and attname = 'post_id'
    );
  if c is not null then
    execute format('alter table public.posts drop constraint %I', c);
  end if;
end $$;

alter table public.posts
  add constraint posts_post_id_handle_key unique (post_id, instagram_handle);

-- Verify (expect the composite constraint listed)
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.posts'::regclass and contype = 'u';
