begin;

update activities set is_active=false
where category='Gaming' and name in (
  'Co-op games','Puzzle rooms','Party games','Cosy games','Board games'
);

insert into activities(category,name)
select 'Gaming',choice.name
from (values
  ('Action & adventure games'),
  ('Role-playing games (RPGs)'),
  ('Shooter games'),
  ('Strategy games'),
  ('Simulation & management games'),
  ('Cosy & indie games')
) as choice(name)
where not exists (
  select 1 from activities existing where lower(existing.name)=lower(choice.name)
);

update activities set category='Gaming',is_active=true
where name in (
  'Action & adventure games',
  'Role-playing games (RPGs)',
  'Shooter games',
  'Strategy games',
  'Simulation & management games',
  'Cosy & indie games'
);

commit;
