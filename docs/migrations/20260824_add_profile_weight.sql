alter table profiles add column if not exists weight_kg smallint;

alter table profiles drop constraint if exists profiles_weight_kg_check;
alter table profiles add constraint profiles_weight_kg_check
  check (weight_kg is null or weight_kg between 35 and 300);
