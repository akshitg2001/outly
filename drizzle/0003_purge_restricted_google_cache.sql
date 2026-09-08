DELETE FROM venues WHERE source = 'google_places';
--> statement-breakpoint
UPDATE venues SET
  name = 'Verified venue ' || substr(place_id, 1, 8),
  primary_type = NULL,
  address = NULL,
  lat = NULL,
  lng = NULL,
  rating = NULL,
  rating_count = NULL,
  price_level = NULL,
  hours_json = NULL,
  image_ref = NULL,
  google_maps_url = NULL,
  website_url = NULL
WHERE source = 'admin';
--> statement-breakpoint
PRAGMA optimize;
