insert into activities (category, name) values
  ('Culture', 'Gallery walks'), ('Culture', 'Museums'), ('Culture', 'Theatre'), ('Culture', 'Indie films'), ('Culture', 'Live music'), ('Culture', 'Comedy nights'),
  ('Food and drink', 'Markets'), ('Food and drink', 'Casual food spots'), ('Food and drink', 'Cooking classes'), ('Food and drink', 'Dessert crawl'), ('Food and drink', 'Picnics'), ('Food and drink', 'Supper clubs'),
  ('Outdoors', 'Riverside walks'), ('Outdoors', 'Hikes'), ('Outdoors', 'Parks'), ('Outdoors', 'Cycling'), ('Outdoors', 'Street photography'), ('Outdoors', 'Botanical gardens'),
  ('Sports', 'Park tennis'), ('Sports', 'Climbing'), ('Sports', 'Running clubs'), ('Sports', 'Table tennis'), ('Sports', 'Casual football'), ('Sports', 'Swimming'),
  ('Gaming', 'Co-op games'), ('Gaming', 'Puzzle rooms'), ('Gaming', 'Party games'), ('Gaming', 'Strategy games'), ('Gaming', 'Cosy games'), ('Gaming', 'Board games'),
  ('Learning', 'Workshops'), ('Learning', 'Talks'), ('Learning', 'Language exchange'), ('Learning', 'Bookshops'), ('Learning', 'Craft classes'), ('Learning', 'Trivia nights')
on conflict do nothing;
