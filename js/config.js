(function () {
  'use strict';

  window.OGDC_CONFIG = Object.freeze({
    appName: 'Inventory OGDC',

    // Gunakan Project URL, bukan URL /rest/v1/
    supabaseUrl: 'https://jdthhrqokvaflenuecsi.supabase.co',

    // Tempel Publishable Key terbaru dari Supabase
    supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkdGhocnFva3ZhZmxlbnVlY3NpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5MTI5OTEsImV4cCI6MjEwMDQ4ODk5MX0.I_T52YUmUpsIwM3B_MHx3J6_mZtXX5VvkKbeKBib3Yk',

    storageBucket: 'ogdc-evidence',
    signedUrlSeconds: 3600,

    // admin akan otomatis menjadi admin@ogdc.local
    usernameEmailDomain: 'ogdc.local'
  });
})();
