(function () {
  'use strict';

  window.OGDC_CONFIG = Object.freeze({
    appName: 'Inventory OGDC',

    // Supabase createClient membutuhkan Project URL, bukan URL /rest/v1/.
    supabaseUrl: 'https://jdthhrqokvaflenuecsi.supabase.co',

    // Publishable/anon key aman diletakkan di frontend hanya jika RLS tetap aktif.
    supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkdGhocnFva3ZhZmxlbnVlY3NpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5MTI5OTEsImV4cCI6MjEwMDQ4ODk5MX0.I_T52YUmUpsIwM3B_MHx3J6_mZtXX5VvkKbeKBib3Yk',

    storageBucket: 'ogdc-evidence',
    signedUrlSeconds: 60 * 60,

    // Login lama memakai username. Frontend mengubah "admin" menjadi
    // "admin@ogdc.local" sebelum dikirim ke Supabase Auth.
    usernameEmailDomain: 'ogdc.local'
  });
})();
