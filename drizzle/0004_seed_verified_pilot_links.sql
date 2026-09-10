INSERT INTO venues (id, place_id, kind, name, categories, dietary, booking_url, source, enabled, refreshed_at) VALUES
  ('pilot-link-01', 'ChIJhSQX4zb9DDkRWCjFRnNLnyA', 'dining', 'Pilot dining link 01', '[]', '[]', 'https://www.zomato.com/ncr/farzi-cafe-connaught-place-new-delhi/book', 'admin', 1, 1788998400000),
  ('pilot-link-02', 'ChIJ52Rpnjb9DDkRoefV8uKYSDA', 'dining', 'Pilot dining link 02', '[]', '[]', 'https://www.zomato.com/ncr/tamasha-connaught-place-new-delhi/book', 'admin', 1, 1788998400000),
  ('pilot-link-03', 'ChIJ0QjkF-jiDDkRM6GgdVPQqoE', 'dining', 'Pilot dining link 03', '[]', '[]', 'https://www.zomato.com/ncr/mamagoto-khan-market-new-delhi/book', 'admin', 1, 1788998400000),
  ('pilot-link-04', 'ChIJO2trNejiDDkR_NfaZlpD-QU', 'dining', 'Pilot dining link 04', '[]', '[]', 'https://www.zomato.com/ncr/perch-wine-coffee-bar-khan-market-new-delhi/book', 'admin', 1, 1788998400000),
  ('pilot-link-05', 'ChIJlVVxenXiDDkR0ONp1eDBSO0', 'dining', 'Pilot dining link 05', '[]', '[]', 'https://www.zomato.com/ncr/coast-cafe-hauz-khas-village-new-delhi/book', 'admin', 1, 1788998400000),
  ('pilot-link-06', 'ChIJUS1n0sDjDDkRSBqS8iwg5H8', 'dining', 'Pilot dining link 06', '[]', '[]', 'https://www.zomato.com/ncr/raiya-hauz-khas-new-delhi/book', 'admin', 1, 1788998400000),
  ('pilot-link-07', 'ChIJVXYjooodDTkRIr5IEbZVxEc', 'dining', 'Pilot dining link 07', '[]', '[]', 'https://www.zomato.com/ncr/mia-bella-romantic-kitchen-bar-hauz-khas-village-new-delhi/book', 'admin', 1, 1788998400000),
  ('pilot-link-08', 'ChIJSbxF7jPiDDkRFCSE3PBPkl0', 'dining', 'Pilot dining link 08', '[]', '[]', 'https://www.zomato.com/ncr/music-mountains-hillside-cafe-cocktail-garden-greater-kailash-gk-1-new-delhi/book', 'admin', 1, 1788998400000),
  ('pilot-link-09', 'ChIJ1R_SFmkcDTkRKZ_2Cwjo0Ss', 'dining', 'Pilot dining link 09', '[]', '[]', 'https://www.zomato.com/ncr/k3-jw-marriott-new-delhi-aerocity-new-delhi/book', 'admin', 1, 1788998400000),
  ('pilot-link-10', 'ChIJ-_2GW9wdDTkRRoPh5k531MM', 'dining', 'Pilot dining link 10', '[]', '[]', 'https://www.zomato.com/ncr/daryaganj-by-the-inventors-of-butter-chicken-and-dal-makhani-aerocity-new-delhi/book', 'admin', 1, 1788998400000),
  ('pilot-link-11', 'ChIJFc2bT8_jDDkRJAbqQAQTKtQ', 'dining', 'Pilot dining link 11', '[]', '[]', 'https://www.zomato.com/NehruPlaceSocial/book', 'admin', 1, 1788998400000),
  ('pilot-link-12', 'ChIJC8mFuUDjDDkR5r9lTUyEWPU', 'dining', 'Pilot dining link 12', '[]', '[]', 'https://www.zomato.com/ncr/youmee-nehru-place-new-delhi/book', 'admin', 1, 1788998400000),
  ('pilot-link-13', 'ChIJM7bCPlfiDDkRVMxhg4JdaYE', 'dining', 'Pilot dining link 13', '[]', '[]', 'https://www.zomato.com/ncr/akus-the-burger-co-defence-colony-new-delhi/book', 'admin', 1, 1788998400000),
  ('pilot-link-14', 'ChIJ-3kLNFfiDDkRYdLqu4JAyhw', 'dining', 'Pilot dining link 14', '[]', '[]', 'https://www.zomato.com/ncr/moets-curry-leaf-defence-colony-new-delhi/book', 'admin', 1, 1788998400000),
  ('pilot-link-15', 'ChIJVyVoSTADDTkRbyvsQ6U7wl8', 'dining', 'Pilot dining link 15', '[]', '[]', 'https://www.zomato.com/ncr/youmee-netaji-subhash-place-new-delhi/book', 'admin', 1, 1788998400000)
ON CONFLICT(place_id) DO UPDATE SET
  booking_url = excluded.booking_url,
  source = 'admin',
  enabled = 1,
  refreshed_at = excluded.refreshed_at;
--> statement-breakpoint
PRAGMA optimize;
