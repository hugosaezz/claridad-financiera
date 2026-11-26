  <script>
    // ============================================================================
    // 0. SELF-HOSTED OFFLINE SVG ICON SYSTEM (Zero Network / Zero Text Ligatures)
    // ============================================================================
    const SVG_ICONS = {
      // Navigation & Layout
      home: '<path d="M3 10.5L12 3l9 7.5"/><path d="M5.5 9.5V20a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.5"/><path d="M9.5 21v-6a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v6"/>',
      groups: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
      add: '<path d="M12 5v14"/><path d="M5 12h14"/>',
      add_circle: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8"/><path d="M8 12h8"/>',
      insights: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 6-7"/>',
      person: '<circle cx="12" cy="8" r="4"/><path d="M4 20a8 8 0 0 1 16 0"/>',
      settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
      tune: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/><circle cx="8" cy="6" r="2" fill="currentColor"/><circle cx="16" cy="12" r="2" fill="currentColor"/><circle cx="10" cy="18" r="2" fill="currentColor"/>',
      dashboard: '<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="5" rx="2"/><rect x="13" y="10" width="8" height="11" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/>',
      account_balance_wallet: '<path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2"/><path d="M3 7h16a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-3a2 2 0 0 1 0-4h5"/>',
      swap_horiz: '<path d="M7 16H3m0 0 4-4m-4 4 4 4"/><path d="M17 8h4m0 0-4-4m4 4-4 4"/><path d="M3 16h14"/><path d="M7 8h14"/>',
      chevron_left: '<path d="m15 18-6-6 6-6"/>',
      chevron_right: '<path d="m9 18 6-6-6-6"/>',
      chevron_down: '<path d="m6 9 6 6 6-6"/>',
      close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
      arrow_upward: '<path d="M12 19V5"/><path d="m5 12 7-7 7 7"/>',
      arrow_downward: '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
      arrow_back: '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
      open_in_new: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',

      // Finance, Categories & Methods
      receipt_long: '<path d="M4 2v20l2.5-1.5L9 22l2.5-1.5L14 22l2.5-1.5L19 22V2l-2.5 1.5L14 2l-2.5 1.5L9 2 6.5 3.5Z"/><path d="M8 8h8"/><path d="M8 12h8"/><path d="M8 16h5"/>',
      receipt: '<path d="M5 3v18l2-1.5L9 21l3-1.5L15 21l2-1.5L19 21V3H5Z"/><path d="M9 8h6"/><path d="M9 12h6"/><path d="M9 16h4"/>',
      payments: '<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 9v.01"/><path d="M18 15v.01"/>',
      paid: '<circle cx="12" cy="12" r="9"/><path d="M14.5 9.5a2.5 2.5 0 0 0-5 0c0 2.5 5 2 5 5a2.5 2.5 0 0 1-5 0"/><path d="M12 6v1.5"/><path d="M12 16.5V18"/>',
      trending_up: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
      trending_down: '<path d="m22 17-8.5-8.5-5 5L2 7"/><path d="M16 17h6v-6"/>',
      shopping_cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.4 12.2a1 1 0 0 0 1 .8h9.7a1 1 0 0 0 1-.8L21 7H6"/>',
      add_shopping_cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.4 12.2a1 1 0 0 0 1 .8h9.7a1 1 0 0 0 1-.8L21 8"/><path d="M13 4v6"/><path d="M10 7h6"/>',
      restaurant: '<path d="M3 2v7c0 1.7 1.3 3 3 3h1v10"/><path d="M7 2v7"/><path d="M15 2v20"/><path d="M15 2c2.8 0 5 2.2 5 5v5h-5"/>',
      train: '<rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 11h14"/><path d="M9 17l-2 4"/><path d="M15 17l2 4"/><circle cx="9" cy="14" r="1" fill="currentColor"/><circle cx="15" cy="14" r="1" fill="currentColor"/>',
      shopping_bag: '<path d="M6 7h12l1 13H5L6 7Z"/><path d="M9 7V6a3 3 0 0 1 6 0v1"/>',
      autorenew: '<path d="M21 12a9 9 0 0 0-15.5-6.3L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 15.5 6.3L21 16"/><path d="M16 16h5v5"/>',
      favorite: '<path d="M19.5 13.5 12 21l-7.5-7.5A5.25 5.25 0 0 1 12 6.3a5.25 5.25 0 0 1 7.5 7.2Z"/>',
      flight_takeoff: '<path d="M2 21h20"/><path d="M19.8 11.4 4.5 15.5l-2-3.5 2-.5 2.5 1.5 5-1.4-4-6.1 2.2-.6 6.4 5.4 3.6-1a1.6 1.6 0 0 1 1.9 1.1 1.6 1.6 0 0 1-2.3 1Z"/>',
      category: '<rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><circle cx="17.25" cy="17.25" r="3.75"/>',
      bolt: '<path d="M13 2 4 14h7l-1 8 10-12h-7l0-8Z"/>',
      send_to_mobile: '<rect x="6" y="2" width="11" height="20" rx="2"/><path d="M10 18h3"/><path d="M13 10h8m0 0-3-3m3 3-3 3"/>',
      storefront: '<path d="M3 9 5 4h14l2 5"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/><path d="M5 12v8h14v-8"/>',
      redeem: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/><path d="M7.5 8a2.5 2.5 0 1 1 0-5C10 3 12 8 12 8"/><path d="M16.5 8a2.5 2.5 0 1 0 0-5C14 3 12 8 12 8"/>',
      credit_card: '<rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20"/><path d="M6 15h4"/>',
      account_balance: '<path d="M3 10h18"/><path d="M5 10v8"/><path d="M10 10v8"/><path d="M14 10v8"/><path d="M19 10v8"/><path d="M2 20h20"/><path d="M12 3 3 8h18l-9-5Z"/>',
      contactless: '<path d="M7.5 9.5a6 6 0 0 1 0 5"/><path d="M11 7a9.5 9.5 0 0 1 0 10"/><path d="M14.5 4.5a13 13 0 0 1 0 15"/>',
      sports_esports: '<rect x="2" y="7" width="20" height="11" rx="5"/><path d="M7 12h4"/><path d="M9 10v4"/><circle cx="15.5" cy="11" r="1" fill="currentColor"/><circle cx="17.5" cy="13" r="1" fill="currentColor"/>',
      music_note: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
      fitness_center: '<path d="M6.5 6.5v11"/><path d="M17.5 6.5v11"/><path d="M3.5 9v6"/><path d="M20.5 9v6"/><path d="M6.5 12h11"/>',
      menu_book: '<path d="M2 5.5A2.5 2.5 0 0 1 4.5 3H12v17H4.5A2.5 2.5 0 0 1 2 17.5v-12Z"/><path d="M22 5.5A2.5 2.5 0 0 0 19.5 3H12v17h7.5a2.5 2.5 0 0 0 2.5-2.5v-12Z"/>',
      directions_car: '<path d="M5 11 7 5h10l2 6"/><rect x="3" y="11" width="18" height="6" rx="2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
      pets: '<circle cx="6.5" cy="9.5" r="2"/><circle cx="10.5" cy="6.5" r="2"/><circle cx="14.5" cy="6.5" r="2"/><circle cx="18" cy="9.5" r="2"/><path d="M12 12c-3 0-5.5 2.4-5.5 5a2.5 2.5 0 0 0 2.5 2.5c1.2 0 2-.5 3-.5s1.8.5 3 .5a2.5 2.5 0 0 0 2.5-2.5c0-2.6-2.5-5-5.5-5Z"/>',
      sports_soccer: '<circle cx="12" cy="12" r="9"/><polygon points="12,8 15.5,10.6 14.2,14.8 9.8,14.8 8.5,10.6"/><path d="M12 3v5"/><path d="M20.5 9.5 15.5 10.6"/><path d="M17.5 19.2 14.2 14.8"/><path d="M6.5 19.2 9.8 14.8"/><path d="M3.5 9.5 8.5 10.6"/>',
      calculate: '<rect x="4" y="2" width="16" height="20" rx="2.5"/><path d="M8 6h8"/><path d="M8 11h2"/><path d="M14 11h2"/><path d="M8 15h2"/><path d="M14 15h2"/><path d="M8 19h8"/>',
      call_split: '<path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M12 21v-8.5L3 3"/><path d="m15 9 6-6"/>',
      track_changes: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>',
      assignment_return: '<path d="M9 14 4 9l5-5"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/>',
      local_fire_department: '<path d="M12 22c4.5 0 7-3.2 7-7 0-3.5-2-6.5-4.5-9.5-.4 2-1.8 3-2.5 3 0-3-1.5-5.5-3.5-6.5C7 5.5 5 8.5 5 15c0 3.8 2.5 7 7 7Z"/>',
      handshake: '<path d="m11 17 2 2a1.5 1.5 0 1 0 2-2l-2-2"/><path d="m14 14 2.5 2.5a1.5 1.5 0 1 0 2-2L14 10"/><path d="M18 11l2-2-4-4-3 3-2-2-4 4 4 4"/><path d="m2 12 4 4 3-3"/>',
      savings: '<path d="M19 10c0-3.5-3.1-6-7-6S5 6.5 5 10c0 2.3 1.2 4.3 3 5.3V19h2.5v-1.5h3V19H16v-3.7c1.8-1 3-3 3-5.3Z"/><path d="M19 10h2v2h-2"/><circle cx="14.5" cy="9" r="1" fill="currentColor"/>',

      // Actions, Status & Utilities
      photo_camera: '<path d="M14.5 4h-5L7.5 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3.5l-2-3Z"/><circle cx="12" cy="13" r="3.5"/>',
      add_a_photo: '<path d="M14.5 4h-5L7.5 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3.5l-2-3Z"/><path d="M12 10v6"/><path d="M9 13h6"/>',
      mic: '<rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><path d="M12 17v5"/><path d="M8 22h8"/>',
      send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
      check_circle: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/>',
      check: '<path d="m5 13 4 4L19 7"/>',
      done_all: '<path d="m2 13 4 4L16 7"/><path d="m9 16 1 1 10-10"/>',
      verified: '<path d="M12 2 4 5v6c0 5.5 3.4 10.3 8 11.7 4.6-1.4 8-6.2 8-11.7V5l-8-3Z"/><path d="m9 12 2 2 4-4"/>',
      task_alt: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 5-5.5"/>',
      schedule: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
      history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>',
      warning: '<path d="M10.3 3.9 1.8 18.5A2 2 0 0 0 3.5 21.5h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><circle cx="12" cy="17" r=".8" fill="currentColor"/>',
      visibility: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
      visibility_off: '<path d="M17.9 17.9A10.1 10.1 0 0 1 12 19c-6.5 0-10-7-10-7a18.5 18.5 0 0 1 5.1-5.9"/><path d="M9.9 4.2A9.8 9.8 0 0 1 12 5c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.2 3.2"/><path d="M14.1 14.1a3 3 0 0 1-4.2-4.2"/><path d="m2 2 20 20"/>',
      notifications: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
      notifications_active: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/><path d="M4 3c-1.3 1.4-2 3.2-2 5"/><path d="M20 3c1.3 1.4 2 3.2 2 5"/>',
      notifications_off: '<path d="M8.7 3A6 6 0 0 1 18 8a21.3 21.3 0 0 0 .6 5"/><path d="M17 17H3s3-2 3-9a6 6 0 0 1 .4-2.2"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/><path d="m2 2 20 20"/>',
      dark_mode: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>',
      light_mode: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.9 4.9 1.4 1.4"/><path d="m17.7 17.7 1.4 1.4"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.3 17.7-1.4 1.4"/><path d="m19.1 4.9-1.4 1.4"/>',
      sync: '<path d="M21 12a9 9 0 0 0-15.5-6.3L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 15.5 6.3L21 16"/><path d="M16 16h5v5"/>',
      cloud_done: '<path d="M17.5 19H9a5 5 0 0 1-.5-9.97A6.5 6.5 0 0 1 20.8 11a4 4 0 0 1-3.3 8Z"/><path d="m9.5 14 2 2 4-4"/>',
      cloud_sync: '<path d="M17.5 19H9a5 5 0 0 1-.5-9.97A6.5 6.5 0 0 1 20.8 11a4 4 0 0 1-3.3 8Z"/><path d="M12 11v6"/><path d="m9.5 14.5 2.5 2.5 2.5-2.5"/>',
      cloud_off: '<path d="M17.5 19H9a5 5 0 0 1-.5-9.97"/><path d="m2 2 20 20"/><path d="M15.6 5.2A6.5 6.5 0 0 1 20.8 11a4 4 0 0 1-1.3 7.5"/>',
      delete: '<path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6"/><path d="M14 11v6"/>',
      delete_sweep: '<path d="M3 6h12"/><path d="M6 6V4h6v2"/><path d="M13 6v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6"/><path d="M16 10h6"/><path d="M16 14h5"/><path d="M16 18h3"/>',
      edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z"/>',
      edit_note: '<path d="M4 6h12"/><path d="M4 11h12"/><path d="M4 16h7"/><path d="m14.5 18.5 4.5-4.5 2 2-4.5 4.5H14.5v-2Z"/>',
      undo: '<path d="M9 14 4 9l5-5"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/>',
      search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
      search_off: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/><path d="m8.5 8.5 5 5"/><path d="m13.5 8.5-5 5"/>',
      download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>',
      upload_file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M12 18v-6"/><path d="m9 15 3-3 3 3"/>',
      table_view: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M9 10v10"/><path d="M15 10v10"/>',
      ios_share: '<path d="M12 3v12"/><path d="m8 7 4-4 4 4"/><path d="M4 13v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6"/>',
      person_add: '<circle cx="9" cy="7" r="4"/><path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2"/><path d="M19 8v6"/><path d="M16 11h6"/>',
      group_add: '<circle cx="9" cy="7" r="3.5"/><path d="M2 20v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2"/><path d="M19 8v6"/><path d="M16 11h6"/>',
      switch_account: '<circle cx="12" cy="8" r="3.5"/><path d="M5 19a7 7 0 0 1 14 0"/><path d="M2 8h3"/><path d="M19 8h3"/>',
      login: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="m10 17 5-5-5-5"/><path d="M15 12H3"/>',
      logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
      lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
      shield: '<path d="M12 2 4 5v6c0 5.5 3.4 10.3 8 11.7 4.6-1.4 8-6.2 8-11.7V5l-8-3Z"/>',
      info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4"/><circle cx="12" cy="8" r=".8" fill="currentColor"/>',
      auto_awesome: '<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z"/><path d="m19 16 .9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9Z"/>',
      auto_fix_high: '<path d="m15 4 5 5-11 11-5-5Z"/><path d="m12 7 5 5"/><path d="M4 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1Z"/>',
      tips_and_updates: '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2Z"/>',
      psychology_alt: '<path d="M9.5 2A5.5 5.5 0 0 0 4 7.5c0 2 .9 3.6 2 4.8V16a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-1h2a2 2 0 0 0 2-2v-2l1.5-1.5L18 7a5.5 5.5 0 0 0-8.5-5Z"/><path d="M10 9a1.5 1.5 0 1 1 2.5 1.1c-.5.4-.5.9-.5 1.4"/><circle cx="12" cy="14" r=".6" fill="currentColor"/>',
      speed: '<path d="M12 21a9 9 0 1 1 9-9c0 2.5-1 4.7-2.6 6.4"/><path d="m12 12 4.5-4.5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>',
      emoji_events: '<path d="M6 9H4a2 2 0 0 1-2-2V5h4"/><path d="M18 9h2a2 2 0 0 0 2-2V5h-4"/><path d="M6 4h12v6a6 6 0 0 1-12 0V4Z"/><path d="M12 16v4"/><path d="M8 20h8"/>',
      calendar_month: '<rect x="3" y="4" width="18" height="17" rx="2.5"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/>',
      inventory_2: '<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>',
      database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
      phone_iphone: '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M10 18h4"/>',
      chat: '<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 1 1 21 11.5Z"/>',
      hard_drive: '<rect x="2" y="13" width="20" height="8" rx="2"/><path d="M5.5 5 2 13h20l-3.5-8a2 2 0 0 0-1.8-1H7.3a2 2 0 0 0-1.8 1Z"/><circle cx="17" cy="17" r="1" fill="currentColor"/>',
      snowflake: '<path d="M12 2v20"/><path d="m4.9 4.9 14.2 14.2"/><path d="M2 12h20"/><path d="m19.1 4.9-14.2 14.2"/>',
      code: '<path d="m8 18-6-6 6-6"/><path d="m16 6 6 6-6 6"/>'
    };

    const ICON_EMOJI_FALLBACK = {
      home: '🏠', groups: '👥', add: '➕', insights: '📊', person: '👤', settings: '⚙️',
      receipt_long: '🧾', payments: '💶', trending_up: '📈', photo_camera: '📸', mic: '🎤',
      notifications: '🔔', visibility: '👁️', visibility_off: '🙈', dark_mode: '🌙', light_mode: '☀️',
      calendar_month: '📅', sync: '🔄', close: '✕', delete: '🗑️', edit: '✏️', check_circle: '✅',
      warning: '⚠️', handshake: '🤝', local_fire_department: '🔥', snowflake: '❄️', hard_drive: '💾'
    };

    /**
     * Renders an inline self-hosted SVG icon. Never leaks technical icon names to UI.
     */
    function ico(name, extraClass = '', filled = false) {
      const key = String(name || '').trim();
      const body = SVG_ICONS[key];
      if (!body) {
        const fb = ICON_EMOJI_FALLBACK[key] || '•';
        return `<span class="inline-flex items-center justify-center leading-none select-none ${extraClass}" aria-hidden="true">${fb}</span>`;
      }
      return `<svg viewBox="0 0 24 24" fill="${filled ? 'currentColor' : 'none'}" fill-opacity="${filled ? '0.18' : '0'}" stroke="currentColor" stroke-width="${filled ? '2.25' : '1.9'}" stroke-linecap="round" stroke-linejoin="round" class="app-icon ${filled ? 'is-filled' : ''} ${extraClass}" aria-hidden="true">${body}</svg>`;
    }

    /**
     * Safety net: converts any static <i data-ico="name"> or legacy .material-symbols-outlined
     * nodes into crisp inline SVGs so zero ligature text can ever appear in the DOM.
     */
    function hydrateAppIcons(root = document) {
      if (!root || !root.querySelectorAll) return;
      root.querySelectorAll('[data-ico]').forEach(el => {
        const name = el.getAttribute('data-ico');
        const filled = el.classList.contains('filled') || el.getAttribute('data-filled') === 'true';
        const sizeCls = el.getAttribute('data-ico-cls') || '';
        el.innerHTML = ico(name, sizeCls, filled);
        el.removeAttribute('data-ico');
      });
      root.querySelectorAll('.material-symbols-outlined').forEach(el => {
        const raw = (el.textContent || '').trim();
        if (!raw || el.querySelector('svg')) return;
        const filled = el.classList.contains('filled');
        const cls = Array.from(el.classList).filter(c => c !== 'material-symbols-outlined' && c !== 'filled').join(' ');
        el.innerHTML = ico(raw, cls, filled);
        el.classList.remove('material-symbols-outlined');
        el.classList.add('inline-flex', 'items-center', 'justify-center');
      });
    }
  </script>
