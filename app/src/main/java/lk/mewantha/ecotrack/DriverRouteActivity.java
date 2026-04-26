package lk.mewantha.ecotrack;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.Address;
import android.location.Geocoder;
import android.location.Location;
import android.location.LocationManager;
import android.os.Bundle;
import android.text.TextUtils;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.View;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.Switch;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.widget.NestedScrollView;

import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.google.android.material.bottomnavigation.BottomNavigationView;
import com.google.android.material.tabs.TabLayout;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.firestore.DocumentReference;
import com.google.firebase.firestore.DocumentSnapshot;
import com.google.firebase.firestore.QueryDocumentSnapshot;
import com.google.firebase.firestore.SetOptions;

import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TimeZone;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import lk.mewantha.ecotrack.database.FirebaseDb;

public class DriverRouteActivity extends AppCompatActivity {

    private static final int REQ_LOCATION = 1001;

    /** OpenStreetMap default view: Sri Lanka (no API key required). */
    private static final double SL_CENTER_LAT = 7.8731;
    private static final double SL_CENTER_LNG = 80.7718;
    private static final int SL_ZOOM = 8;
    private static final int GPS_ZOOM = 12;

    private View updateLayout;
    private View recentLayout;
    private TextView tvSharingStatus;
    private Switch swLocationSharing;
    private TextView tvLastUpdated;
    private TextView tvLatitude;
    private TextView tvLongitude;
    private TextView tvAddress;
    private TextView tvMapPlaceholder;
    private TextView btnUseGps;
    private TextView btnSearchAddress;
    private LinearLayout recentLocationsContainer;
    private TextView tvRecentEmpty;

    private WebView mapWebView;
    private NestedScrollView routeScroll;
    @Nullable
    private Double mapLat;
    @Nullable
    private Double mapLng;
    /** Route summary line for map overlay (from Firestore `routes`) */
    private String routeMapHint = "";

    private boolean suppressSwitchListener;
    private final ExecutorService ioExecutor = Executors.newSingleThreadExecutor();

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_driver_route);

        Toolbar toolbar = findViewById(R.id.toolbar);
        toolbar.setNavigationOnClickListener(v -> finish());

        bindViews();

        mapWebView = findViewById(R.id.map_preview);
        routeScroll = findViewById(R.id.route_scroll);
        if (mapWebView != null) {
            setupOsmWebView();
            setupMapScrollTouch();
            refreshOsmMapPreview();
        }

        TabLayout tabLayout = findViewById(R.id.tab_layout);
        updateLayout = findViewById(R.id.layout_update_location);
        recentLayout = findViewById(R.id.layout_recent_locations);

        updateLayout.setVisibility(View.VISIBLE);
        recentLayout.setVisibility(View.GONE);

        tabLayout.addOnTabSelectedListener(new TabLayout.OnTabSelectedListener() {
            @Override
            public void onTabSelected(TabLayout.Tab tab) {
                if (tab.getPosition() == 0) {
                    updateLayout.setVisibility(View.VISIBLE);
                    recentLayout.setVisibility(View.GONE);
                } else {
                    updateLayout.setVisibility(View.GONE);
                    recentLayout.setVisibility(View.VISIBLE);
                }
            }

            @Override
            public void onTabUnselected(TabLayout.Tab tab) {
            }

            @Override
            public void onTabReselected(TabLayout.Tab tab) {
            }
        });

        swLocationSharing.setOnCheckedChangeListener((buttonView, isChecked) -> {
            if (suppressSwitchListener)
                return;
            FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
            if (user == null)
                return;
            FirebaseDb.firestore()
                    .collection("driver")
                    .document(user.getUid())
                    .update("locationSharingEnabled", isChecked)
                    .addOnSuccessListener(unused -> updateSharingUi(isChecked))
                    .addOnFailureListener(e -> Toast
                            .makeText(DriverRouteActivity.this, "Could not update setting", Toast.LENGTH_SHORT).show());
        });

        btnUseGps.setOnClickListener(v -> fetchGpsLocation());
        btnSearchAddress.setOnClickListener(v -> showAddressSearchDialog());

        BottomNavigationView bottomNav = findViewById(R.id.bottom_nav);
        bottomNav.setSelectedItemId(R.id.nav_route);
        bottomNav.setOnItemSelectedListener(item -> {
            int id = item.getItemId();
            if (id == R.id.nav_home) {
                startActivity(new Intent(this, DriverDashboardActivity.class));
                overridePendingTransition(0, 0);
                return true;
            } else if (id == R.id.nav_collections) {
                startActivity(new Intent(this, DriverCollectionsActivity.class));
                overridePendingTransition(0, 0);
                return true;
            } else if (id == R.id.nav_route) {
                return true;
            } else if (id == R.id.nav_earnings) {
                startActivity(new Intent(this, DriverEarningsActivity.class));
                overridePendingTransition(0, 0);
                return true;
            }
            return false;
        });

        loadDriverLocationProfile();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (mapWebView != null)
            mapWebView.onResume();
        loadDriverLocationProfile();
    }

    @Override
    protected void onPause() {
        if (mapWebView != null)
            mapWebView.onPause();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (mapWebView != null) {
            mapWebView.destroy();
            mapWebView = null;
        }
        ioExecutor.shutdown();
        super.onDestroy();
    }

    /** OpenStreetMap via Leaflet (CDN). Needs INTERNET. No Google Maps API key. */
    private void setupOsmWebView() {
        WebSettings ws = mapWebView.getSettings();
        ws.setJavaScriptEnabled(true);
        ws.setDomStorageEnabled(true);
        ws.setCacheMode(WebSettings.LOAD_DEFAULT);
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
            ws.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        }
        mapWebView.setWebViewClient(new WebViewClient());
        mapWebView.setWebChromeClient(new WebChromeClient());
        mapWebView.setBackgroundColor(0xfff5f5f5);
    }

    private void setupMapScrollTouch() {
        if (mapWebView == null || routeScroll == null)
            return;
        mapWebView.setOnTouchListener((v, event) -> {
            int action = event.getActionMasked();
            if (action == MotionEvent.ACTION_DOWN) {
                routeScroll.requestDisallowInterceptTouchEvent(true);
            } else if (action == MotionEvent.ACTION_UP || action == MotionEvent.ACTION_CANCEL) {
                routeScroll.requestDisallowInterceptTouchEvent(false);
            }
            return false;
        });
    }

    /** Reload OSM preview: Sri Lanka overview, or zoom to saved GPS with marker. */
    private void refreshOsmMapPreview() {
        refreshMapOverlayText();
        if (mapWebView == null)
            return;

        double viewLat = SL_CENTER_LAT;
        double viewLng = SL_CENTER_LNG;
        int zoom = SL_ZOOM;
        boolean showMarker = false;
        double markLat = 0;
        double markLng = 0;

        if (mapLat != null && mapLng != null) {
            viewLat = mapLat;
            viewLng = mapLng;
            zoom = GPS_ZOOM;
            showMarker = true;
            markLat = mapLat;
            markLng = mapLng;
        }

        String html = buildOsmLeafletHtml(viewLat, viewLng, zoom, showMarker, markLat, markLng);
        mapWebView.loadDataWithBaseURL("https://localhost/", html, "text/html", "UTF-8", null);
    }

    private String buildOsmLeafletHtml(double viewLat, double viewLng, int zoom, boolean showMarker,
            double markLat, double markLng) {
        String lat = String.format(Locale.US, "%.6f", viewLat);
        String lng = String.format(Locale.US, "%.6f", viewLng);
        String mlat = String.format(Locale.US, "%.6f", markLat);
        String mlng = String.format(Locale.US, "%.6f", markLng);
        return "<!DOCTYPE html><html><head><meta charset=\"utf-8\"/>"
                + "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no\"/>"
                + "<link rel=\"stylesheet\" href=\"https://unpkg.com/leaflet@1.9.4/dist/leaflet.css\"/>"
                + "<script src=\"https://unpkg.com/leaflet@1.9.4/dist/leaflet.js\"></script>"
                + "<style>html,body,#map{height:100%;margin:0;padding:0;}</style></head><body>"
                + "<div id=\"map\"></div><script>"
                + "var map=L.map('map').setView([" + lat + "," + lng + "]," + zoom + ");"
                + "L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);"
                + (showMarker ? "L.marker([" + mlat + "," + mlng + "]).addTo(map).bindPopup('Saved location');" : "")
                + "</script></body></html>";
    }

    private void refreshMapOverlayText() {
        if (tvMapPlaceholder == null)
            return;
        StringBuilder sb = new StringBuilder();
        if (routeMapHint != null && !routeMapHint.isEmpty()) {
            sb.append(routeMapHint);
        }
        if (mapLat != null && mapLng != null) {
            if (sb.length() > 0)
                sb.append("\n");
            sb.append(String.format(Locale.getDefault(), "GPS: %.5f, %.5f", mapLat, mapLng));
        } else {
            if (sb.length() > 0)
                sb.append("\n");
            sb.append(getString(R.string.route_map_hint_no_location));
        }
        tvMapPlaceholder.setText(sb.toString());
    }

    private void bindViews() {
        tvSharingStatus = findViewById(R.id.tv_sharing_status);
        swLocationSharing = findViewById(R.id.sw_location_sharing);
        tvLastUpdated = findViewById(R.id.tv_last_updated);
        tvLatitude = findViewById(R.id.tv_latitude);
        tvLongitude = findViewById(R.id.tv_longitude);
        tvAddress = findViewById(R.id.tv_address);
        tvMapPlaceholder = findViewById(R.id.tv_map_placeholder);
        btnUseGps = findViewById(R.id.btn_use_gps);
        btnSearchAddress = findViewById(R.id.btn_search_address);
        recentLocationsContainer = findViewById(R.id.recent_locations_container);
        tvRecentEmpty = findViewById(R.id.tv_recent_empty);
    }

    private void loadDriverLocationProfile() {
        FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
        if (user == null) {
            tvLastUpdated.setText("Sign in to sync location");
            mapLat = null;
            mapLng = null;
            refreshOsmMapPreview();
            return;
        }
        String uid = user.getUid();

        FirebaseDb.firestore()
                .collection("driver")
                .document(uid)
                .get()
                .addOnSuccessListener(doc -> {
                    if (doc == null || !doc.exists()) {
                        tvLatitude.setText("—");
                        tvLongitude.setText("—");
                        tvAddress.setText("—");
                        tvLastUpdated.setText(getString(R.string.route_last_updated));
                        mapLat = null;
                        mapLng = null;
                        refreshOsmMapPreview();
                        renderLocationHistory(null);
                        return;
                    }

                    Boolean sharing = doc.getBoolean("locationSharingEnabled");
                    boolean on = sharing == null || sharing;
                    suppressSwitchListener = true;
                    swLocationSharing.setChecked(on);
                    suppressSwitchListener = false;
                    updateSharingUi(on);

                    Double lat = doc.getDouble("lastLatitude");
                    Double lng = doc.getDouble("lastLongitude");
                    String addr = doc.getString("lastAddress");
                    Long updated = doc.getLong("lastLocationUpdatedMillis");

                    tvLatitude.setText(lat != null ? String.format(Locale.getDefault(), "%.6f", lat) : "—");
                    tvLongitude.setText(lng != null ? String.format(Locale.getDefault(), "%.6f", lng) : "—");
                    tvAddress.setText(addr != null && !addr.trim().isEmpty() ? addr : "—");

                    if (updated != null && updated > 0) {
                        tvLastUpdated.setText("Last updated: " + formatTime(updated));
                    } else {
                        tvLastUpdated.setText(getString(R.string.route_last_updated));
                    }

                    mapLat = lat;
                    mapLng = lng;
                    refreshOsmMapPreview();

                    @SuppressWarnings("unchecked")
                    List<Map<String, Object>> history = (List<Map<String, Object>>) doc.get("locationHistory");
                    renderLocationHistory(history);
                })
                .addOnFailureListener(
                        e -> Toast.makeText(this, "Could not load driver profile", Toast.LENGTH_SHORT).show());
    }

    private void updateSharingUi(boolean enabled) {
        tvSharingStatus.setText(enabled ? getString(R.string.route_status_active) : "Paused");
        tvSharingStatus.setTextColor(getResources().getColor(
                enabled ? R.color.primaryColor : R.color.grey_600, getTheme()));
    }

    private void renderLocationHistory(@Nullable List<Map<String, Object>> history) {
        recentLocationsContainer.removeAllViews();
        if (history == null || history.isEmpty()) {
            tvRecentEmpty.setVisibility(View.VISIBLE);
            return;
        }
        tvRecentEmpty.setVisibility(View.GONE);

        List<Map<String, Object>> sorted = new ArrayList<>(history);
        sorted.sort((a, b) -> Long.compare(coalesceLong(getLongFromMap(b, "atMillis"), 0L),
                coalesceLong(getLongFromMap(a, "atMillis"), 0L)));

        float density = getResources().getDisplayMetrics().density;
        int p16 = (int) (16 * density);
        int mb8 = (int) (8 * density);

        for (int i = 0; i < sorted.size(); i++) {
            Map<String, Object> row = sorted.get(i);
            double lat = getDoubleFromMap(row, "lat");
            double lng = getDoubleFromMap(row, "lng");
            long at = coalesceLong(getLongFromMap(row, "atMillis"), 0L);
            String addr = row.get("address") != null ? String.valueOf(row.get("address")) : "";

            LinearLayout card = (LinearLayout) LayoutInflater.from(this)
                    .inflate(R.layout.item_route_location_history, recentLocationsContainer, false);
            TextView tvCity = card.findViewById(R.id.tv_history_title);
            TextView tvWhen = card.findViewById(R.id.tv_history_time);
            TextView tvCoords = card.findViewById(R.id.tv_history_coords);

            tvCity.setText(addr != null && !addr.trim().isEmpty() ? addr : "Location update");
            tvWhen.setText(at > 0 ? formatTime(at) : "—");
            tvCoords.setText(String.format(Locale.getDefault(), "%.5f, %.5f", lat, lng));

            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT);
            if (i < sorted.size() - 1)
                lp.bottomMargin = mb8;
            card.setLayoutParams(lp);
            card.setPadding(p16, p16, p16, p16);
            recentLocationsContainer.addView(card);
        }
    }

    private void fetchGpsLocation() {
        if (!ensureLocationPermission())
            return;

        FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
        if (user == null) {
            Toast.makeText(this, "Sign in required", Toast.LENGTH_SHORT).show();
            return;
        }

        LocationManager lm = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        if (lm == null) {
            Toast.makeText(this, "Location unavailable", Toast.LENGTH_SHORT).show();
            return;
        }

        try {
            Location loc = lm.getLastKnownLocation(LocationManager.GPS_PROVIDER);
            if (loc == null) {
                loc = lm.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);
            }
            if (loc == null) {
                Toast.makeText(this, "No last known location. Move outdoors and try again.", Toast.LENGTH_LONG).show();
                return;
            }
            double altitude = loc.hasAltitude() ? loc.getAltitude() : 0.0;
            reverseGeocodeAndSave(user.getUid(), loc.getLatitude(), loc.getLongitude(), altitude);
        } catch (SecurityException e) {
            Toast.makeText(this, "Location permission denied", Toast.LENGTH_SHORT).show();
        }
    }

    private boolean ensureLocationPermission() {
        if (ContextCompat.checkSelfPermission(this,
                Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
            return true;
        }
        ActivityCompat.requestPermissions(
                this,
                new String[] { Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION },
                REQ_LOCATION);
        return false;
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions,
            @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_LOCATION) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                fetchGpsLocation();
            } else {
                Toast.makeText(this, "Location permission is needed to use GPS", Toast.LENGTH_LONG).show();
            }
        }
    }

    private void showAddressSearchDialog() {
        FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
        if (user == null) {
            Toast.makeText(this, "Sign in required", Toast.LENGTH_SHORT).show();
            return;
        }

        final EditText input = new EditText(this);
        input.setHint("City, street, landmark…");
        int pad = (int) (16 * getResources().getDisplayMetrics().density);
        input.setPadding(pad, pad, pad, pad);

        new AlertDialog.Builder(this)
                .setTitle("Search address")
                .setView(input)
                .setPositiveButton("Find", (dialog, which) -> {
                    String q = input.getText().toString().trim();
                    if (q.isEmpty()) {
                        Toast.makeText(this, "Enter an address", Toast.LENGTH_SHORT).show();
                        return;
                    }
                    geocodeQueryAndSave(user.getUid(), q);
                })
                .setNegativeButton("Cancel", null)
                .show();
    }

    private void geocodeQueryAndSave(String uid, String query) {
        ioExecutor.execute(() -> {
            try {
                if (!Geocoder.isPresent()) {
                    runOnUiThread(() -> Toast.makeText(this, "Geocoder not available on this device", Toast.LENGTH_LONG)
                            .show());
                    return;
                }
                Geocoder geocoder = new Geocoder(this, Locale.getDefault());
                List<Address> list = geocoder.getFromLocationName(query, 3);
                runOnUiThread(() -> {
                    if (list == null || list.isEmpty()) {
                        Toast.makeText(this, "No results for that address", Toast.LENGTH_LONG).show();
                        return;
                    }
                    Address a = list.get(0);
                    String line = a.getAddressLine(0);
                    // No altitude from geocoding, so store 0.0
                    saveLocationToFirestore(uid, a.getLatitude(), a.getLongitude(), 0.0, line != null ? line : query);
                    applyLocationUi(a.getLatitude(), a.getLongitude(), line != null ? line : query);
                });
            } catch (IOException e) {
                runOnUiThread(() -> Toast.makeText(this, "Address lookup failed", Toast.LENGTH_SHORT).show());
            }
        });
    }

    private void reverseGeocodeAndSave(String uid, double lat, double lng, double altitude) {
        ioExecutor.execute(() -> {
            String addressLine = "";
            try {
                if (Geocoder.isPresent()) {
                    Geocoder geocoder = new Geocoder(this, Locale.getDefault());
                    List<Address> list = geocoder.getFromLocation(lat, lng, 1);
                    if (list != null && !list.isEmpty() && list.get(0).getAddressLine(0) != null) {
                        addressLine = list.get(0).getAddressLine(0);
                    }
                }
            } catch (IOException ignored) {
            }

            String finalAddr = addressLine;
            runOnUiThread(() -> {
                saveLocationToFirestore(uid, lat, lng, altitude, finalAddr);
                applyLocationUi(lat, lng, finalAddr.isEmpty() ? "—" : finalAddr);
                Toast.makeText(this, "Location updated", Toast.LENGTH_SHORT).show();
            });
        });
    }

    private void applyLocationUi(double lat, double lng, String address) {
        tvLatitude.setText(String.format(Locale.getDefault(), "%.6f", lat));
        tvLongitude.setText(String.format(Locale.getDefault(), "%.6f", lng));
        tvAddress.setText(address);
        mapLat = lat;
        mapLng = lng;
        refreshOsmMapPreview();
        long now = System.currentTimeMillis();
        tvLastUpdated.setText("Last updated: " + formatTime(now));
    }

    private void saveLocationToFirestore(String uid, double lat, double lng, double altitude, String address) {
        DocumentReference ref = FirebaseDb.firestore().collection("driver").document(uid);
        ref.get().addOnSuccessListener(doc -> {
            List<Map<String, Object>> history = new ArrayList<>();
            if (doc.exists()) {
                Object h = doc.get("locationHistory");
                if (h instanceof List) {
                    for (Object o : (List<?>) h) {
                        if (o instanceof Map) {
                            @SuppressWarnings("unchecked")
                            Map<String, Object> m = (Map<String, Object>) o;
                            history.add(m);
                        }
                    }
                }
            }
            Map<String, Object> entry = new HashMap<>();
            entry.put("lat", lat);
            entry.put("lng", lng);
            entry.put("altitude", altitude);
            entry.put("atMillis", System.currentTimeMillis());
            entry.put("address", address != null ? address : "");

            history.add(0, entry);
            if (history.size() > 25) {
                history = new ArrayList<>(history.subList(0, 25));
            }

            Map<String, Object> updates = new HashMap<>();
            updates.put("lastLatitude", lat);
            updates.put("lastLongitude", lng);
            updates.put("lastAltitude", altitude);
            updates.put("lastAddress", address != null ? address : "");
            updates.put("lastLocationUpdatedMillis", System.currentTimeMillis());
            updates.put("locationHistory", history);

            ref.set(updates, SetOptions.merge())
                    .addOnSuccessListener(unused -> loadDriverLocationProfile())
                    .addOnFailureListener(e -> Toast
                            .makeText(DriverRouteActivity.this, "Could not save location", Toast.LENGTH_SHORT).show());
        });
    }

    private String formatTime(long millis) {
        Date d = new Date(millis);
        SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd h:mm a", Locale.getDefault());
        f.setTimeZone(TimeZone.getDefault());
        return f.format(d);
    }

    private static long coalesceLong(Long v, long def) {
        return v != null ? v : def;
    }

    private static Long getLongFromMap(Map<String, Object> m, String key) {
        Object v = m.get(key);
        if (v instanceof Long)
            return (Long) v;
        if (v instanceof Integer)
            return ((Integer) v).longValue();
        if (v instanceof Double)
            return ((Double) v).longValue();
        return null;
    }

    private static double getDoubleFromMap(Map<String, Object> m, String key) {
        Object v = m.get(key);
        if (v instanceof Double)
            return (Double) v;
        if (v instanceof Long)
            return ((Long) v).doubleValue();
        if (v instanceof Integer)
            return ((Integer) v).doubleValue();
        return 0d;
    }
}
