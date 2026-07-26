/**
 * INVENTORY OGDC — SUPABASE ADAPTER
 * Version: V22.5 FULL LOGIN FIX
 *
 * File ini menggantikan koneksi google.script.run dengan Supabase.
 * Login yang diketik sebagai username, misalnya ADMIN atau EON,
 * otomatis dikonversi menjadi admin@ogdc.local atau eon@ogdc.local.
 *
 * WAJIB dimuat setelah:
 * 1. https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2
 * 2. js/config.js
 */
(function () {
  'use strict';

  var config = window.OGDC_CONFIG || {};
  var library = window.supabase;

  if (!library || typeof library.createClient !== 'function') {
    console.error('Supabase JS belum termuat.');
    return;
  }

  var projectUrl = String(config.supabaseUrl || '').replace(/\/rest\/v1\/?$/i, '').replace(/\/$/, '');
  var anonKey = String(config.supabaseAnonKey || '').trim();

  if (!projectUrl || !anonKey) {
    console.error('OGDC_CONFIG.supabaseUrl atau supabaseAnonKey belum diisi.');
    return;
  }

  var client = library.createClient(projectUrl, anonKey, {
    db: { schema: 'public' },
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    global: {
      headers: { 'x-application-name': 'inventory-ogdc-github' }
    }
  });

  var signedCache = new Map();

  function clean(value) {
    return value === null || value === undefined ? '' : String(value).trim();
  }

  function errorText(error) {
    if (!error) return 'Error tidak diketahui.';
    return error.message || error.details || error.hint || String(error);
  }

  function authErrorText(error, email) {
    var message = errorText(error);
    var lower = message.toLowerCase();

    if (lower.indexOf('invalid login credentials') >= 0) {
      return 'Login gagal. Akun Authentication ' + email +
        ' belum dibuat atau password salah. Buat akun di Supabase > Authentication > Users, bukan hanya di Table Editor.';
    }

    if (lower.indexOf('email not confirmed') >= 0) {
      return 'Login gagal. Akun ' + email +
        ' belum dikonfirmasi. Buka Supabase > Authentication > Users lalu pastikan akun sudah Confirmed.';
    }

    if (lower.indexOf('user not found') >= 0) {
      return 'Login gagal. Akun Authentication ' + email + ' tidak ditemukan.';
    }

    if (lower.indexOf('fetch') >= 0 || lower.indexOf('network') >= 0) {
      return 'Login gagal karena koneksi ke Supabase terputus. Periksa internet lalu muat ulang halaman.';
    }

    return 'Login gagal: ' + message;
  }

  function uuid() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (char) {
      var random = Math.random() * 16 | 0;
      var value = char === 'x' ? random : (random & 0x3 | 0x8);
      return value.toString(16);
    });
  }

  function safeFileName(value) {
    return clean(value || 'evidence')
      .replace(/[^A-Za-z0-9._-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 100) || 'evidence';
  }

  function usernameToEmail(username) {
    var value = clean(username).toLowerCase();
    if (!value) return '';

    // Bila pengguna sudah mengetik email lengkap, gunakan apa adanya.
    if (value.indexOf('@') >= 0) return value;

    var domain = clean(config.usernameEmailDomain || 'ogdc.local')
      .toLowerCase()
      .replace(/^@+/, '')
      .replace(/\s+/g, '');

    if (!domain) domain = 'ogdc.local';
    return value + '@' + domain;
  }

  async function rpc(functionName, parameters) {
    var response = await client.rpc(functionName, parameters || {});
    if (response.error) throw new Error(errorText(response.error));
    var data = response.data;
    if (data && data.success === false) throw new Error(data.message || 'Request gagal.');
    return data || { success: true };
  }

  async function fetchProfile(authUser) {
    if (!authUser || !authUser.id) {
      throw new Error('Data pengguna Supabase tidak tersedia.');
    }

    var profileResult = await client
      .from('profiles')
      .select('id, username, display_name, role, vendor_id, status')
      .eq('id', authUser.id)
      .maybeSingle();

    if (profileResult.error) {
      throw new Error('Gagal membaca public.profiles: ' + errorText(profileResult.error));
    }

    if (!profileResult.data) {
      throw new Error(
        'Akun Authentication berhasil, tetapi profil belum tersedia di public.profiles. ' +
        'Jalankan SQL penghubung profil untuk ' + clean(authUser.email) + '.'
      );
    }

    var profile = profileResult.data || {};
    if (clean(profile.status).toLowerCase() !== 'active') {
      throw new Error('Akun masih Inactive. Aktifkan akun pada tabel public.profiles.');
    }

    var vendorName = '';
    if (profile.vendor_id) {
      var vendorResult = await client
        .from('vendors')
        .select('vendor_name')
        .eq('vendor_id', profile.vendor_id)
        .maybeSingle();
      if (!vendorResult.error && vendorResult.data) vendorName = vendorResult.data.vendor_name || '';
    }

    var sessionResult = await client.auth.getSession();
    var accessToken = sessionResult.data && sessionResult.data.session ? sessionResult.data.session.access_token : '';

    return {
      username: profile.username || clean(authUser.email).split('@')[0],
      display_name: profile.display_name || profile.username || 'USER',
      role: clean(profile.role || 'OILMAN').toUpperCase(),
      vendor_name: vendorName,
      session_token: accessToken
    };
  }

  async function requireAuth() {
    var result = await client.auth.getSession();
    if (result.error) throw new Error(errorText(result.error));
    if (!result.data || !result.data.session) {
      throw new Error('Sesi login berakhir. Silakan login kembali.');
    }
    return result.data.session;
  }

  function dataUrlToBlob(dataUrl) {
    if (!dataUrl) return null;
    var match = String(dataUrl).match(/^data:([^;]+);base64,(.+)$/);
    if (!match) throw new Error('Format file Base64 tidak valid.');
    var mimeType = match[1];
    var binary = atob(match[2]);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mimeType });
  }

  async function uploadEvidence(folder, base64Data, originalName) {
    if (!base64Data) return '';
    await requireAuth();

    var blob = dataUrlToBlob(base64Data);
    var now = new Date();
    var year = String(now.getFullYear());
    var month = String(now.getMonth() + 1).padStart(2, '0');
    var fileName = safeFileName(originalName || ('evidence_' + Date.now()));
    var path = [clean(folder || 'other'), year, month, uuid() + '_' + fileName].join('/');

    var upload = await client.storage
      .from(config.storageBucket || 'ogdc-evidence')
      .upload(path, blob, {
        cacheControl: '3600',
        contentType: blob.type || 'application/octet-stream',
        upsert: false
      });

    if (upload.error) throw new Error('Upload bukti gagal: ' + errorText(upload.error));
    return upload.data.path;
  }

  async function signedUrl(path) {
    path = clean(path);
    if (!path) return '';
    if (/^https?:\/\//i.test(path) || /^blob:/i.test(path) || /^data:/i.test(path)) return path;

    var cached = signedCache.get(path);
    if (cached && cached.expiresAt > Date.now() + 30000) return cached.url;

    var signed = await client.storage
      .from(config.storageBucket || 'ogdc-evidence')
      .createSignedUrl(path, Number(config.signedUrlSeconds || 3600));

    if (signed.error) {
      console.warn('Gagal membuat signed URL:', path, signed.error);
      return '';
    }

    var url = signed.data && signed.data.signedUrl ? signed.data.signedUrl : '';
    signedCache.set(path, {
      url: url,
      expiresAt: Date.now() + Number(config.signedUrlSeconds || 3600) * 1000
    });
    return url;
  }

  async function signHistoryData(data) {
    data = data || {};
    var rows = data.rows || [];
    await Promise.all(rows.map(async function (row) {
      row.PHOTO_PATH = row.PHOTO_URL || '';
      row.PDF_PATH = row.PDF_URL || '';
      row.PHOTO_URL = await signedUrl(row.PHOTO_PATH);
      row.PDF_URL = await signedUrl(row.PDF_PATH);
    }));
    return data;
  }

  async function signIbcData(data) {
    data = data || {};
    var rows = data.rows || [];
    await Promise.all(rows.map(async function (row) {
      row.PHOTO_PATH = row.PHOTO_URL || '';
      row.PDF_PATH = row.PDF_URL || '';
      row.PHOTO_URL = await signedUrl(row.PHOTO_PATH);
      row.PDF_URL = await signedUrl(row.PDF_PATH);
    }));
    return data;
  }

  async function getInitialData() {
    return rpc('ogdc_get_initial_data');
  }

  async function getDashboard(filters) {
    var data = await rpc('ogdc_get_dashboard_base', { p_filters: filters || {} });
    data.controlTowerVersion = 'V22-SUPABASE-GITHUB';
    data.databaseConnected = true;
    return data;
  }

  async function getHistory(filters) {
    return signHistoryData(await rpc('ogdc_get_history', { p_filters: filters || {} }));
  }

  async function getIbcMonitoring(filters) {
    return signIbcData(await rpc('ogdc_get_ibc_monitoring', { p_filters: filters || {} }));
  }

  async function prepareInventoryPayload(payload, folder) {
    var copy = Object.assign({}, payload || {});
    if (copy.photoBase64) {
      copy.photoPath = await uploadEvidence(folder, copy.photoBase64, copy.photoName);
    }
    delete copy.photoBase64;
    delete copy.photoName;
    return copy;
  }

  async function submitInventory(type, payload) {
    var prepared = await prepareInventoryPayload(payload, type === 'OUT' ? 'inventory-out' : 'inventory-in');
    var result = await rpc(type === 'OUT' ? 'ogdc_submit_out' : 'ogdc_submit_in', { p_payload: prepared });
    result.data = await getInitialData();
    if (result.photoPath) result.photoUrl = await signedUrl(result.photoPath);
    return result;
  }

  async function saveIbc(payload) {
    var copy = Object.assign({}, payload || {});
    if (copy.photoBase64) {
      copy.photoPath = await uploadEvidence('ibc', copy.photoBase64, copy.photoName);
    }
    delete copy.photoBase64;
    delete copy.photoName;
    delete copy.existingPhotoUrl;

    var result = await rpc('ogdc_save_ibc', { p_payload: copy });
    result.data = await getIbcMonitoring({});
    return result;
  }

  async function getHistoryTransaction(transactionId) {
    var query = await client
      .from('inventory_transactions')
      .select([
        'transaction_id',
        'transaction_date',
        'transaction_type',
        'shift',
        'receiver',
        'source_location',
        'destination_location',
        'do_number',
        'fillup_no',
        'username_snapshot',
        'created_at',
        'vendors(vendor_name)',
        'inventory_transaction_items(id, material_id, pat_number_snapshot, description_snapshot, qty, unit, unit_number, stock_before, stock_after)'
      ].join(','))
      .eq('transaction_id', transactionId)
      .single();

    if (query.error) throw new Error('Transaksi tidak ditemukan: ' + errorText(query.error));
    var row = query.data || {};
    var details = (row.inventory_transaction_items || []).slice().sort(function (a, b) { return Number(a.id) - Number(b.id); });
    return {
      TRX_ID: row.transaction_id,
      TRX_DATE: row.transaction_date,
      TYPE: row.transaction_type,
      SHIFT: row.shift,
      VENDOR: row.vendors ? row.vendors.vendor_name : '',
      PENERIMA: row.receiver,
      SUMBER: row.source_location,
      TUJUAN: row.destination_location,
      DO_NUMBER: row.do_number,
      FILLUP_NO: row.fillup_no,
      USERNAME: row.username_snapshot,
      CREATED_AT: row.created_at,
      details: details.map(function (item) {
        return {
          MATERIAL_ID: item.material_id,
          PAT_NUMBER: item.pat_number_snapshot,
          MATERIAL_DESCRIPTION: item.description_snapshot,
          QTY: item.qty,
          SATUAN: item.unit,
          NO_LAMBUNG: item.unit_number,
          STOCK_BEFORE: item.stock_before,
          STOCK_AFTER: item.stock_after
        };
      })
    };
  }

  async function createHistoryPdf(transactionId) {
    var row = await getHistoryTransaction(transactionId);
    var result = window.OGDC_PDF.createTransaction(row.TYPE, {
      TRX_ID: row.TRX_ID,
      date: row.TRX_DATE,
      shift: row.SHIFT,
      vendor: row.VENDOR,
      penerima: row.PENERIMA,
      sumber: row.SUMBER,
      tujuan: row.TUJUAN,
      doNumber: row.DO_NUMBER,
      fillupNo: row.FILLUP_NO,
      username: row.USERNAME,
      details: row.details
    });
    result.message = 'PDF transaksi ' + transactionId + ' berhasil dibuat dan siap diunduh.';
    return result;
  }

  async function createIbcPdf(payload) {
    payload = payload || {};
    var record = payload;
    var monitoring = null;

    if (payload.ibcId) {
      monitoring = await getIbcMonitoring({ keyword: payload.ibcId });
      record = (monitoring.rows || []).find(function (row) {
        return String(row.IBC_ID) === String(payload.ibcId);
      });
      if (!record) throw new Error('Data IBC tidak ditemukan: ' + payload.ibcId);
    }

    var result = window.OGDC_PDF.createIbcDelivery(record);
    if (monitoring) result.data = monitoring;
    return result;
  }

  async function createIbcMonitoringPdf(filters) {
    var data = await getIbcMonitoring(filters || {});
    return window.OGDC_PDF.createIbcMonitoring(data, filters || {});
  }

  async function login(username, password) {
    var rawUsername = clean(username);
    var rawPassword = clean(password);
    var email = usernameToEmail(rawUsername);

    if (!rawUsername || !rawPassword) {
      throw new Error('Username dan password wajib diisi.');
    }

    if (!email) {
      throw new Error('Username tidak valid.');
    }

    console.info('[OGDC LOGIN] Username dikonversi menjadi:', email);

    var result = await client.auth.signInWithPassword({
      email: email,
      password: rawPassword
    });

    if (result.error) {
      throw new Error(authErrorText(result.error, email));
    }

    if (!result.data || !result.data.user || !result.data.session) {
      throw new Error('Supabase tidak mengirim sesi login. Silakan coba kembali.');
    }

    try {
      var user = await fetchProfile(result.data.user);
      user.session_token = result.data.session.access_token || user.session_token || '';
      return {
        success: true,
        message: 'Login berhasil sebagai ' + (user.display_name || user.username || rawUsername) + '.',
        user: user
      };
    } catch (error) {
      await client.auth.signOut();
      throw error;
    }
  }

  async function restoreSession() {
    var result = await client.auth.getSession();
    if (result.error || !result.data || !result.data.session) return null;
    try {
      return await fetchProfile(result.data.session.user);
    } catch (error) {
      console.warn('Sesi tidak dapat dipulihkan:', error);
      await client.auth.signOut();
      return null;
    }
  }

  async function signOut() {
    signedCache.clear();
    await client.auth.signOut();
  }

  async function ping() {
    var response = await fetch(projectUrl + '/auth/v1/settings', {
      method: 'GET',
      headers: { apikey: anonKey }
    });
    if (!response.ok) throw new Error('Supabase tidak dapat dihubungi. HTTP ' + response.status);
    return {
      success: true,
      message: 'Supabase aktif',
      appName: config.appName || 'Inventory OGDC',
      serverTime: new Date().toLocaleString('id-ID')
    };
  }

  async function saveMaterial(material) {
    var result = await rpc('ogdc_save_material', { p_material: material || {} });
    var initial = await getInitialData();
    result.materials = initial.materialsAll || [];
    return result;
  }

  async function saveVendor(vendor) {
    var result = await rpc('ogdc_save_vendor', { p_vendor: vendor || {} });
    var initial = await getInitialData();
    result.vendors = initial.vendorsAll || [];
    return result;
  }

  async function inactiveVendor(id) {
    var result = await rpc('ogdc_inactive_vendor', { p_vendor_id: id });
    var initial = await getInitialData();
    result.vendors = initial.vendorsAll || [];
    return result;
  }

  async function saveSloc(sloc) {
    var result = await rpc('ogdc_save_sloc', { p_sloc: sloc || {} });
    var initial = await getInitialData();
    result.slocs = initial.slocsAll || [];
    return result;
  }

  async function inactiveSloc(id) {
    var result = await rpc('ogdc_inactive_sloc', { p_sloc_id: id });
    var initial = await getInitialData();
    result.slocs = initial.slocsAll || [];
    return result;
  }

  async function dispatch(functionName, args) {
    args = Array.isArray(args) ? args : [];

    switch (functionName) {
      case 'apiPing':
        return ping();
      case 'apiRunSetup':
        return { success: true, message: 'Database Supabase sudah disiapkan melalui SQL Editor' };
      case 'apiLogin':
        return login(args[0], args[1]);
      case 'apiGetInitialData':
        await requireAuth();
        return getInitialData();
      case 'apiGetDashboard':
      case 'apiGetDashboardControlTower':
        await requireAuth();
        return getDashboard(args[0] || {});
      case 'apiGetReadiness':
        await requireAuth();
        return rpc('ogdc_get_readiness', { p_filters: args[0] || {} });
      case 'apiGetPlanDashboard':
        await requireAuth();
        return rpc('ogdc_get_plan_dashboard', { p_filters: args[0] || {} });
      case 'apiGetHistory':
        await requireAuth();
        return getHistory(args[0] || {});
      case 'apiGetIbcMonitoring':
        await requireAuth();
        return getIbcMonitoring(args[0] || {});
      case 'apiSubmitIn':
        return submitInventory('IN', args[0] || {});
      case 'apiSubmitOut':
        return submitInventory('OUT', args[0] || {});
      case 'apiEditTransaction':
        await requireAuth();
        return rpc('ogdc_edit_inventory', { p_payload: args[0] || {} });
      case 'apiDeleteTransaction':
        await requireAuth();
        return rpc('ogdc_delete_transaction', { p_transaction_id: args[0] && args[0].trxId ? args[0].trxId : args[0] });
      case 'apiSaveIbc':
        return saveIbc(args[0] || {});
      case 'apiCreatePdf':
        await requireAuth();
        return window.OGDC_PDF.createTransaction(args[0], args[1] || {});
      case 'apiCreateHistoryPdf':
        await requireAuth();
        return createHistoryPdf(args[0]);
      case 'apiCreateIbcPdf':
        await requireAuth();
        return createIbcPdf(args[0] || {});
      case 'apiExportIbcMonitoringPdf':
        await requireAuth();
        return createIbcMonitoringPdf(args[0] || {});
      case 'apiSaveMaterial':
        await requireAuth();
        return saveMaterial(args[0] || {});
      case 'apiInactiveMaterial':
        await requireAuth();
        return rpc('ogdc_inactive_material', { p_material_id: args[0] });
      case 'apiSaveVendor':
        await requireAuth();
        return saveVendor(args[0] || {});
      case 'apiInactiveVendor':
        await requireAuth();
        return inactiveVendor(args[0]);
      case 'apiSaveSloc':
        await requireAuth();
        return saveSloc(args[0] || {});
      case 'apiInactiveSloc':
        await requireAuth();
        return inactiveSloc(args[0]);
      case 'apiGetSettings':
        await requireAuth();
        return rpc('ogdc_get_settings');
      case 'apiSavePlan':
        await requireAuth();
        return rpc('ogdc_save_plan', { p_plan: args[0] || {} });
      case 'apiDeletePlan':
        await requireAuth();
        return rpc('ogdc_delete_plan', { p_plan_id: args[0] });
      case 'apiDeleteIbc':
        await requireAuth();
        return rpc('ogdc_delete_ibc', { p_ibc_id: args[0] });
      default:
        throw new Error('API belum dipetakan ke Supabase: ' + functionName);
    }
  }

  window.OGDC_SUPABASE_CLIENT = client;
  window.OGDC_API = Object.freeze({
    version: 'V22.5-FULL-LOGIN-FIX',
    call: dispatch,
    restoreSession: restoreSession,
    signOut: signOut,
    signedUrl: signedUrl,
    usernameToEmail: usernameToEmail,
    client: client
  });

  console.info('[OGDC] Supabase adapter aktif:', window.OGDC_API.version);
})();
