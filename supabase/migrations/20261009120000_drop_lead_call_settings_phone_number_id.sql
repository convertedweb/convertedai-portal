-- A hívószám a projekt Telefon füléről jön (projects.phone_number); az ElevenLabs azonosítóját a config-végpont oldja fel.
alter table lead_call_settings drop column elevenlabs_phone_number_id;
