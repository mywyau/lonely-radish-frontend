create unique index if not exists profiles_display_name_unique
  on profiles (lower(trim(display_name)));
