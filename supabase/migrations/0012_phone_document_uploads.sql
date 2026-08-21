update storage.buckets
   set allowed_mime_types = array[
    'application/pdf',
    'text/plain',
    'text/markdown',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/csv',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
 where id = 'knowledge-base';
