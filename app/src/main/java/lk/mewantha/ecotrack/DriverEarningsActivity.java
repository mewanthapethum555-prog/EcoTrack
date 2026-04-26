package lk.mewantha.ecotrack;

import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;

import com.google.android.material.bottomnavigation.BottomNavigationView;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.firestore.DocumentSnapshot;
import com.google.firebase.firestore.QueryDocumentSnapshot;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;

import lk.mewantha.ecotrack.database.FirebaseDb;

public class DriverEarningsActivity extends AppCompatActivity {

    private TextView tvWelcome;
    private TextView tvTruckInfo;
    private TextView tvEarningsToday;
    private TextView tvEarningsWeek;
    private TextView tvEarningsMonth;
    private TextView tvEarningsTotal;
    private LinearLayout recentEarningsContainer;
    private TextView tvEarningsEmpty;
    private ImageView btnRefreshEarnings;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_driver_earnings);

        Toolbar toolbar = findViewById(R.id.toolbar);
        toolbar.setNavigationOnClickListener(v -> finish());

        tvWelcome = findViewById(R.id.tv_welcome);
        tvTruckInfo = findViewById(R.id.tv_truck_info);
        tvEarningsToday = findViewById(R.id.tv_earnings_today);
        tvEarningsWeek = findViewById(R.id.tv_earnings_week);
        tvEarningsMonth = findViewById(R.id.tv_earnings_month);
        tvEarningsTotal = findViewById(R.id.tv_earnings_total);
        recentEarningsContainer = findViewById(R.id.recent_earnings_container);
        tvEarningsEmpty = findViewById(R.id.tv_earnings_empty);
        btnRefreshEarnings = findViewById(R.id.btn_refresh_earnings);

        btnRefreshEarnings.setOnClickListener(v -> loadEarningsData());

        BottomNavigationView bottomNav = findViewById(R.id.bottom_nav);
        bottomNav.setSelectedItemId(R.id.nav_earnings);
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
                startActivity(new Intent(this, DriverRouteActivity.class));
                overridePendingTransition(0, 0);
                return true;
            } else if (id == R.id.nav_earnings) {
                return true;
            }
            return false;
        });

        loadEarningsData();
    }

    private void loadEarningsData() {
        FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
        if (user == null) {
            setSummaryTexts(0, 0, 0, 0);
            recentEarningsContainer.removeAllViews();
            tvEarningsEmpty.setVisibility(View.VISIBLE);
            tvEarningsEmpty.setText("Sign in to view earnings");
            return;
        }
        final String uid = user.getUid();

        FirebaseDb.firestore()
                .collection("driver")
                .document(uid)
                .get()
                .addOnSuccessListener(doc -> {
                    if (doc != null && doc.exists()) {
                        String name = doc.getString("fullName");
                        if (name != null && !name.trim().isEmpty()) {
                            tvWelcome.setText("Welcome, " + name.trim());
                        }
                        String truck = doc.getString("truck");
                        if (truck != null && !truck.trim().isEmpty()) {
                            tvTruckInfo.setText("Truck: " + truck.trim());
                        }
                    }
                });

        FirebaseDb.firestore()
                .collection("earnings")
                .get()
                .addOnSuccessListener(qs -> {
                    List<EarningRow> mine = new ArrayList<>();
                    for (QueryDocumentSnapshot d : qs) {
                        long created = extractCreatedAtMillis(d);
                        double amt = extractAmount(d);
                        EarningRow row = new EarningRow(created, amt);

                        if (belongsToDriver(d, uid)) {
                            mine.add(row);
                        }
                    }

                    Collections.sort(mine, (a, b) -> Long.compare(b.createdAtMillis, a.createdAtMillis));

                    long now = System.currentTimeMillis();
                    long todayStart = startOfDay(now);
                    long weekStart = startOfWeek(now);
                    long monthStart = startOfMonth(now);

                    double today = 0, week = 0, month = 0, total = 0;
                    for (EarningRow r : mine) {
                        total += r.amount;
                        if (r.createdAtMillis >= todayStart) today += r.amount;
                        if (r.createdAtMillis >= weekStart) week += r.amount;
                        if (r.createdAtMillis >= monthStart) month += r.amount;
                    }

                    setSummaryTexts(today, week, month, total);
                    renderRecentList(mine);
                })
                .addOnFailureListener(e ->
                        Toast.makeText(DriverEarningsActivity.this,
                                "Could not load earnings", Toast.LENGTH_SHORT).show());
    }

    private static boolean belongsToDriver(DocumentSnapshot d, String uid) {
        if (uid == null) return false;
        final String normalizedUid = uid.trim();
        if (normalizedUid.isEmpty()) return false;

        // Support multiple possible field names, and cases where the value is a path/ref containing the uid.
        String[] driverKeys = new String[]{
                "driverId", "driverUid", "driverUID", "driver_uid", "assignedDriverId", "driver"
        };
        for (String key : driverKeys) {
            String v = d.getString(key);
            if (v == null) continue;
            String t = v.trim();
            if (t.equals(normalizedUid)) return true;
            if (t.endsWith("/" + normalizedUid)) return true;
            if (t.endsWith(normalizedUid)) return true;
            if (t.contains(normalizedUid)) return true;
        }

        String[] userKeys = new String[]{
                "userId", "recyclerId", "ownerId", "ownerUid", "userUid", "recycler_uid", "recyclerUid"
        };
        for (String key : userKeys) {
            String v = d.getString(key);
            if (v == null) continue;
            String t = v.trim();
            if (t.equals(normalizedUid)) return true;
            if (t.endsWith("/" + normalizedUid)) return true;
            if (t.endsWith(normalizedUid)) return true;
            if (t.contains(normalizedUid)) return true;
        }

        // Fallback: scan all string/document-reference fields for the uid.
        try {
            java.util.Map<String, Object> data = d.getData();
            if (data != null) {
                for (Object value : data.values()) {
                    if (value == null) continue;
                    if (value instanceof String) {
                        String t = ((String) value).trim();
                        if (!t.isEmpty() && t.contains(normalizedUid)) return true;
                    }
                    if (value instanceof com.google.firebase.firestore.DocumentReference) {
                        String id = ((com.google.firebase.firestore.DocumentReference) value).getId();
                        if (id != null && id.trim().equals(normalizedUid)) return true;
                    }
                }
            }
        } catch (Exception ignored) {
            // If getData() fails for any reason, just use the known-key checks above.
        }

        return false;
    }

    private static double extractAmount(DocumentSnapshot d) {
        // amount might be stored as Double or Long, or under alternate keys.
        Double amount = d.getDouble("amount");
        if (amount != null) return amount;

        Long amountL = d.getLong("amount");
        if (amountL != null) return amountL.doubleValue();

        String[] altKeys = new String[]{
                "amountRs", "amountLKR",
                "earningAmount", "earningsAmount",
                "totalAmount", "paymentAmount",
                "amountValue", "value"
        };

        for (String key : altKeys) {
            Double v = d.getDouble(key);
            if (v != null) return v;
            Long l = d.getLong(key);
            if (l != null) return l.doubleValue();
        }

        // Fallback: scan all numeric fields whose key looks like "amount" / "earn".
        try {
            java.util.Map<String, Object> data = d.getData();
            if (data != null) {
                for (java.util.Map.Entry<String, Object> entry : data.entrySet()) {
                    String key = entry.getKey();
                    Object value = entry.getValue();
                    if (key == null || value == null) continue;
                    String k = key.toLowerCase(Locale.getDefault());
                    if (!k.contains("amount") && !k.contains("earn") && !k.contains("payment")) continue;
                    if (value instanceof Number) return ((Number) value).doubleValue();
                }
            }
        } catch (Exception ignored) {
        }

        return 0.0;
    }

    private static long extractCreatedAtMillis(DocumentSnapshot d) {
        Long cm = d.getLong("createdAtMillis");
        if (cm != null) return cm;

        // Support Firestore Timestamp fields.
        com.google.firebase.Timestamp ts = d.getTimestamp("createdAt");
        if (ts != null) return ts.toDate().getTime();

        com.google.firebase.Timestamp ts2 = d.getTimestamp("timestamp");
        if (ts2 != null) return ts2.toDate().getTime();

        // Support string-encoded millis.
        String s = d.getString("createdAtMillis");
        if (s != null) {
            try {
                return Long.parseLong(s.trim());
            } catch (NumberFormatException ignored) {
                // fall through
            }
        }

        // Fallback: scan all timestamp-like fields for created/time keys.
        try {
            java.util.Map<String, Object> data = d.getData();
            if (data != null) {
                for (java.util.Map.Entry<String, Object> entry : data.entrySet()) {
                    String key = entry.getKey();
                    Object value = entry.getValue();
                    if (key == null || value == null) continue;
                    String k = key.toLowerCase(Locale.getDefault());

                    if (value instanceof com.google.firebase.Timestamp) {
                        if (k.contains("created") || k.contains("time") || k.contains("timestamp")) {
                            return ((com.google.firebase.Timestamp) value).toDate().getTime();
                        }
                    }

                    if (value instanceof Number) {
                        if (k.contains("created") || k.contains("time") || k.contains("timestamp")) {
                            return ((Number) value).longValue();
                        }
                    }

                    if (value instanceof String) {
                        String str = ((String) value).trim();
                        if ((k.contains("created") || k.contains("time") || k.contains("timestamp")) && !str.isEmpty()) {
                            try {
                                return Long.parseLong(str);
                            } catch (NumberFormatException ignored) {
                                // fall through
                            }
                        }
                    }
                }
            }
        } catch (Exception ignored) {
        }

        return 0L;
    }

    private static long startOfDay(long millis) {
        Calendar cal = Calendar.getInstance();
        cal.setTimeInMillis(millis);
        cal.set(Calendar.HOUR_OF_DAY, 0);
        cal.set(Calendar.MINUTE, 0);
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);
        return cal.getTimeInMillis();
    }

    private static long startOfWeek(long millis) {
        Calendar cal = Calendar.getInstance();
        cal.setTimeInMillis(millis);
        cal.set(Calendar.DAY_OF_WEEK, cal.getFirstDayOfWeek());
        cal.set(Calendar.HOUR_OF_DAY, 0);
        cal.set(Calendar.MINUTE, 0);
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);
        return cal.getTimeInMillis();
    }

    private static long startOfMonth(long millis) {
        Calendar cal = Calendar.getInstance();
        cal.setTimeInMillis(millis);
        cal.set(Calendar.DAY_OF_MONTH, 1);
        cal.set(Calendar.HOUR_OF_DAY, 0);
        cal.set(Calendar.MINUTE, 0);
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);
        return cal.getTimeInMillis();
    }

    private void setSummaryTexts(double today, double week, double month, double total) {
        Locale loc = Locale.getDefault();
        tvEarningsToday.setText(String.format(loc, "LKR %.2f", today));
        tvEarningsWeek.setText(String.format(loc, "LKR %.2f", week));
        tvEarningsMonth.setText(String.format(loc, "LKR %.2f", month));
        tvEarningsTotal.setText(String.format(loc, "LKR %.2f", total));
    }

    private void renderRecentList(List<EarningRow> sortedNewestFirst) {
        recentEarningsContainer.removeAllViews();
        if (sortedNewestFirst.isEmpty()) {
            tvEarningsEmpty.setVisibility(View.VISIBLE);
            return;
        }
        tvEarningsEmpty.setVisibility(View.GONE);

        int limit = Math.min(20, sortedNewestFirst.size());
        for (int i = 0; i < limit; i++) {
            EarningRow r = sortedNewestFirst.get(i);
            View row = LayoutInflater.from(this)
                    .inflate(R.layout.item_earning_row, recentEarningsContainer, false);
            TextView tvTime = row.findViewById(R.id.tv_earning_time);
            TextView tvAmt = row.findViewById(R.id.tv_earning_amount);
            tvTime.setText(formatEarningTime(r.createdAtMillis));
            tvAmt.setText(String.format(Locale.getDefault(), "LKR %.2f", r.amount));
            recentEarningsContainer.addView(row);
        }
    }

    private String formatEarningTime(long millis) {
        if (millis <= 0) return "—";
        Date d = new Date(millis);
        SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault());
        f.setTimeZone(TimeZone.getDefault());
        return f.format(d);
    }

    private static final class EarningRow {
        final long createdAtMillis;
        final double amount;

        EarningRow(long createdAtMillis, double amount) {
            this.createdAtMillis = createdAtMillis;
            this.amount = amount;
        }
    }
}
