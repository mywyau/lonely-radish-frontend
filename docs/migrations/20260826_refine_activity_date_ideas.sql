begin;

update activities set name='Restaurants'
where name='Supper clubs' and category='Food and drink';

update activities set name='Pilates classes'
where name='Wellness classes' and category='Wellness';

update activities set name='Tai chi'
where name='Relaxed movement' and category='Wellness';

update activities set name='Sound baths'
where name='Self-care activities' and category='Wellness';

update activities set name='Walking tours'
where name='Neighbourhood wandering' and category='Explore';

update activities set name='Community gardening'
where name='Meetups' and category='Community';

commit;
