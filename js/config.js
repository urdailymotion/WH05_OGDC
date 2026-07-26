(function () {
  'use strict';

  window.OGDC_CONFIG = Object.freeze({
    appName: 'Inventory OGDC',

    // Gunakan Project URL, bukan URL /rest/v1/
    supabaseUrl: 'https://jdthhrqokvaflenuecsi.supabase.co',

    // Tempel Publishable Key terbaru dari Supabase
    supabaseAnonKey: 'TEMPEL_PUBLISHABLE_KEY_DI_SINI',

    storageBucket: 'ogdc-evidence',
    signedUrlSeconds: 3600,

    // admin akan otomatis menjadi admin@ogdc.local
    usernameEmailDomain: 'ogdc.local'
  });
})();
