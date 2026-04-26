package lk.mewantha.ecotrack;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import com.google.firebase.firestore.DocumentSnapshot;
import com.google.android.material.bottomnavigation.BottomNavigationView;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.firestore.QueryDocumentSnapshot;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;

import lk.mewantha.ecotrack.database.FirebaseDb;

public class DriverDashboardActivity extends AppCompatActivity {

    private TextView tvWelcome;
    private TextView tvTruckInfo;
    private TextView tvMetricEarnings;
    private TextView tvMetricCollections;
    private TextView tvMetricItems;
    private TextView tvMetricRouteProgress;
    private TextView tvScheduleEmptyTitle;
    private TextView tvScheduleEmptyDesc;
    private LinearLayout notificationsContainer;
    private TextView tvNotificationsEmpty;
    private TextView tvNotificationBadge;
    private ImageView ivLogoutDriver;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_driver_dashboard);

        tvWelcome = findViewById(R.id.tv_welcome);
        tvTruckInfo = findViewById(R.id.tv_truck_info);
        tvMetricEarnings = findViewById(R.id.tv_metric_earnings);
        tvMetricCollections = findViewById(R.id.tv_metric_collections);
        tvMetricItems = findViewById(R.id.tv_metric_items);
        tvMetricRouteProgress = findViewById(R.id.tv_metric_route_progress);
        tvScheduleEmptyTitle = findViewById(R.id.tv_schedule_empty_title);
        tvScheduleEmptyDesc = findViewById(R.id.tv_schedule_empty_desc);
        notificationsContainer = findViewById(R.id.notifications_container);
        tvNotificationsEmpty = findViewById(R.id.tv_notifications_empty);
        tvNotificationBadge = findViewById(R.id.tv_notification_badge);
        ivLogoutDriver = findViewById(R.id.iv_logout_driver);

        if (ivLogoutDriver != null) {
            ivLogoutDriver.setOnClickListener(v -> {
                FirebaseAuth.getInstance().signOut();
                startActivity(new Intent(this, ChooseRoleActivity.class));
                finishAffinity();
            });
        }

        loadDashboardData();
        setupQuickActions();

        BottomNavigationView bottomNav = findViewById(R.id.bottom_nav);
        bottomNav.setSelectedItemId(R.id.nav_home);
        bottomNav.setOnItemSelectedListener(item -> {
            int id = item.getItemId();
            if (id == R.id.nav_home) {
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
                startActivity(new Intent(this, DriverEarningsActivity.class));
                overridePendingTransition(0, 0);
                return true;
            }
            return false;
        });
    }

    private void setupQuickActions() {
        LinearLayout llNavigation = findViewById(R.id.ll_nav_navigation);
        LinearLayout llUpdateLocation = findViewById(R.id.ll_nav_update_location);
        LinearLayout llManagePickups = findViewById(R.id.ll_nav_manage_pickups);

        if (llNavigation != null) {
            llNavigation.setOnClickListener(v -> {
                startActivity(new Intent(this, DriverRouteActivity.class));
            });
        }

        if (llUpdateLocation != null) {
            llUpdateLocation.setOnClickListener(v -> {
                startActivity(new Intent(this, DriverRouteActivity.class));
            });
        }

        if (llManagePickups != null) {
            llManagePickups.setOnClickListener(v -> {
                startActivity(new Intent(this, DriverCollectionsActivity.class));
            });
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        loadDashboardData();
    }

    private void loadDashboardData() {
        FirebaseUser currentUser = FirebaseAuth.getInstance().getCurrentUser();
        if (currentUser == null) return;

        final String uid = currentUser.getUid();

        // Load driver profile from `driver` collection.
        FirebaseDb.firestore()
                .collection("driver")
                .document(uid)
                .get()
                .addOnSuccessListener(doc -> {
                    if (doc != null && doc.exists()) {
                        String name = doc.getString("fullName");
                        if (name != null && !name.trim().isEmpty()) {
                            tvWelcome.setText("Welcome, " + name);
                        }
                        String truck = doc.getString("truck");
                        if (truck != null && !truck.trim().isEmpty()) {
                            tvTruckInfo.setText("Truck: " + truck);
                        }
                    }
                });

        // Earnings (today only, for this driver).
        FirebaseDb.firestore()
                .collection("earnings")
                .get()
                .addOnSuccessListener(qs -> {
                    java.util.Calendar cal = java.util.Calendar.getInstance();
                    cal.setTimeInMillis(System.currentTimeMillis());
                    cal.set(java.util.Calendar.HOUR_OF_DAY, 0);
                    cal.set(java.util.Calendar.MINUTE, 0);
                    cal.set(java.util.Calendar.SECOND, 0);
                    cal.set(java.util.Calendar.MILLISECOND, 0);
                    long todayStart = cal.getTimeInMillis();
                    long todayEnd = todayStart + 24L * 60L * 60L * 1000L;

                    double total = 0.0;
                    for (QueryDocumentSnapshot d : qs) {
                        if (!belongsToDriverEarning(d, uid)) continue;

                        Long createdAt = d.getLong("createdAtMillis");
                        if (createdAt == null || createdAt < todayStart || createdAt >= todayEnd) continue;

                        Double amount = d.getDouble("amount");
                        if (amount != null) total += amount;
                    }
                    tvMetricEarnings.setText(String.format(Locale.getDefault(), "LKR %.2f", total));
                });

        // Pickups metrics (completed count, items weight, today's schedule).
        FirebaseDb.firestore()
                .collection("pickups")
                .addSnapshotListener((qs, e) -> {
                    if (e != null || qs == null) return;
                    int completed = 0;
                    double totalItemsKg = 0.0;
                    int inProgress = 0;
                    int todayCount = 0; // scheduled pickups for today (driver only)
                    int scheduledUpcomingCount = 0; // scheduled pickups upcoming (driver only)
                    List<DocumentSnapshot> todayScheduledNotifications = new ArrayList<>();

                    long now = System.currentTimeMillis();
                    java.util.Calendar cal = java.util.Calendar.getInstance();
                    cal.setTimeInMillis(now);
                    cal.set(java.util.Calendar.HOUR_OF_DAY, 0);
                    cal.set(java.util.Calendar.MINUTE, 0);
                    cal.set(java.util.Calendar.SECOND, 0);
                    cal.set(java.util.Calendar.MILLISECOND, 0);
                    long todayStart = cal.getTimeInMillis();
                    long todayEnd = todayStart + 24L * 60L * 60L * 1000L;

                    for (QueryDocumentSnapshot d : qs) {
                        if (!belongsToDriver(d, uid)) continue;

                        String status = safe(d.getString("status"));
                        Long scheduledAt = d.getLong("scheduledAtMillis");

                        if ("completed".equalsIgnoreCase(status)) {
                            completed += 1;
                            Double kg = d.getDouble("weightKg");
                            if (kg != null) totalItemsKg += kg;
                        } else if ("in_progress".equalsIgnoreCase(status)) {
                            inProgress += 1;
                        }
                        
                        if ("scheduled".equalsIgnoreCase(status) || "in_progress".equalsIgnoreCase(status)) {
                            boolean isToday = scheduledAt != null && scheduledAt >= todayStart && scheduledAt < todayEnd;
                            
                            // Show in today's schedule if it's scheduled for today, OR if it's currently in progress
                            if (isToday || "in_progress".equalsIgnoreCase(status)) {
                                todayCount += 1;
                                todayScheduledNotifications.add(d);
                            }

                            // Notification badge only for scheduled (not yet started) pickups in the future
                            if (scheduledAt != null && scheduledAt >= now && "scheduled".equalsIgnoreCase(status)) {
                                scheduledUpcomingCount += 1;
                            }
                        }
                    }

                    tvMetricCollections.setText(String.valueOf(completed));
                    tvMetricItems.setText(String.format(Locale.getDefault(), "%.1f", totalItemsKg));
                    tvMetricRouteProgress.setText(String.format(Locale.getDefault(), "%d in progress", inProgress));

                    if (todayCount > 0) {
                        tvScheduleEmptyTitle.setText(String.format(Locale.getDefault(), "%d pickups scheduled for today", todayCount));
                        tvScheduleEmptyDesc.setText("Open Collections or Route for details");
                    } else {
                        tvScheduleEmptyTitle.setText(getString(R.string.dash_schedule_empty_title));
                        tvScheduleEmptyDesc.setText(getString(R.string.dash_schedule_empty_desc));
                    }

                    updateNotificationBadge(scheduledUpcomingCount);
                    renderNotifications(todayScheduledNotifications);
                });
    }

    private void updateNotificationBadge(int count) {
        if (tvNotificationBadge == null) return;
        if (count <= 0) {
            tvNotificationBadge.setVisibility(View.GONE);
            return;
        }
        tvNotificationBadge.setVisibility(View.VISIBLE);
        tvNotificationBadge.setText(count > 9 ? "9+" : String.valueOf(count));
    }

    private void renderNotifications(List<? extends com.google.firebase.firestore.DocumentSnapshot> pickups) {
        notificationsContainer.removeAllViews();

        List<com.google.firebase.firestore.DocumentSnapshot> sorted = new ArrayList<>(pickups);
        sorted.sort((a, b) -> {
            Long am = a.getLong("scheduledAtMillis");
            Long bm = b.getLong("scheduledAtMillis");
            long av = am != null ? am : 0L;
            long bv = bm != null ? bm : 0L;
            return Long.compare(bv, av);
        });

        int shown = 0;
        for (com.google.firebase.firestore.DocumentSnapshot d : sorted) {
            // Show one latest pickup notification card.
            if (shown >= 1) break;

            String status = d.getString("status");
            String address = d.getString("address");
            Long when = d.getLong("scheduledAtMillis");

            String title = "Pickup " + d.getId();
            if (address != null && !address.trim().isEmpty()) {
                title = "Pickup scheduled at " + address;
            }

            String statusText = "Pickup status: " + (status != null ? status : "scheduled");
            String timeText = formatTimestamp(when);

            notificationsContainer.addView(buildNotificationCard(title, statusText, timeText, shown < 4));
            shown++;
        }

        if (shown == 0) {
            tvNotificationsEmpty.setVisibility(View.VISIBLE);
        } else {
            tvNotificationsEmpty.setVisibility(View.GONE);
        }
    }

    private LinearLayout buildNotificationCard(String title, String status, String time, boolean withBottomMargin) {
        float density = getResources().getDisplayMetrics().density;
        int p16 = (int) (16 * density);
        int mb12 = (int) (12 * density);
        int mt4 = (int) (4 * density);
        int mt8 = (int) (8 * density);

        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setBackgroundResource(R.drawable.bg_notification_card);
        card.setPadding(p16, p16, p16, p16);

        LinearLayout.LayoutParams cardLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
        );
        if (withBottomMargin) cardLp.bottomMargin = mb12;
        card.setLayoutParams(cardLp);

        TextView tvTitle = new TextView(this);
        tvTitle.setText(title);
        tvTitle.setTextSize(14f);
        tvTitle.setTextColor(getResources().getColor(R.color.black, getTheme()));
        tvTitle.setTypeface(tvTitle.getTypeface(), android.graphics.Typeface.BOLD);
        LinearLayout.LayoutParams titleLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
        );
        titleLp.bottomMargin = mt4;
        tvTitle.setLayoutParams(titleLp);

        TextView tvStatus = new TextView(this);
        tvStatus.setText(status);
        tvStatus.setTextSize(12f);
        tvStatus.setTextColor(getResources().getColor(R.color.grey_600, getTheme()));
        LinearLayout.LayoutParams statusLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
        );
        statusLp.bottomMargin = mt8;
        tvStatus.setLayoutParams(statusLp);

        TextView tvTime = new TextView(this);
        tvTime.setText(time);
        tvTime.setTextSize(11f);
        tvTime.setTextColor(getResources().getColor(R.color.grey_600, getTheme()));

        card.addView(tvTitle);
        card.addView(tvStatus);
        card.addView(tvTime);
        return card;
    }

    private String formatTimestamp(Long millis) {
        if (millis == null || millis <= 0) return "Unknown time";
        Date d = new Date(millis);
        SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd h:mm a", Locale.getDefault());
        f.setTimeZone(TimeZone.getDefault());
        return f.format(d);
    }

    private static String safe(String v) {
        return v == null ? "" : v.trim();
    }

    private boolean belongsToDriver(QueryDocumentSnapshot d, String uid) {
        String assignedDriverId = safe(d.getString("assignedDriverId"));
        String driverId = safe(d.getString("driverId"));
        String pickupDriverUid = safe(d.getString("driverUid"));
        String assignedTo = safe(d.getString("assignedTo"));
        return uid.equals(assignedDriverId)
                || uid.equals(driverId)
                || uid.equals(pickupDriverUid)
                || uid.equals(assignedTo);
    }

    private boolean belongsToDriverEarning(QueryDocumentSnapshot d, String uid) {
        String driverId = safe(d.getString("driverId"));
        String userId = safe(d.getString("userId"));
        String assignedDriverId = safe(d.getString("assignedDriverId"));
        return uid.equals(driverId) || uid.equals(userId) || uid.equals(assignedDriverId);
    }
}
