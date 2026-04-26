package lk.mewantha.ecotrack;

import android.content.Intent;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.widget.LinearLayout;
import android.widget.EditText;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import com.google.android.material.bottomnavigation.BottomNavigationView;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.firestore.DocumentSnapshot;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;

import lk.mewantha.ecotrack.database.FirebaseDb;
import com.journeyapps.barcodescanner.ScanContract;
import com.journeyapps.barcodescanner.ScanOptions;
import androidx.activity.result.ActivityResultLauncher;
import com.bumptech.glide.Glide;
import android.widget.ImageView;

public class DriverCollectionsActivity extends AppCompatActivity {
    private TextView tvWelcome;
    private TextView tvTruckInfo;
    private EditText etSearch;
    private TextView filterAll;
    private TextView filterScheduled;
    private TextView filterInProgress;
    private TextView filterCompleted;
    private TextView filterRejected;
    private LinearLayout collectionsContainer;
    private TextView tvCollectionsEmpty;

    private final List<DocumentSnapshot> allCollections = new ArrayList<>();
    private String selectedFilter = "all";
    private String searchQuery = "";
    private String pendingScanPickupId = null;

    private final ActivityResultLauncher<ScanOptions> qrLauncher = registerForActivityResult(
            new ScanContract(),
            result -> {
                if(result.getContents() == null) {
                    android.widget.Toast.makeText(this, "Scan Cancelled", android.widget.Toast.LENGTH_LONG).show();
                } else {
                    String scannedCode = result.getContents();
                    if (pendingScanPickupId != null && scannedCode.equals("ECOTRACK-" + pendingScanPickupId)) {
                        completePickup(pendingScanPickupId);
                    } else {
                        android.widget.Toast.makeText(this, "Invalid QR Code for this pickup! Scan matching screen.", android.widget.Toast.LENGTH_LONG).show();
                    }
                    pendingScanPickupId = null;
                }
            });

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_driver_collections);

        bindViews();
        loadCollectionsData();

        BottomNavigationView bottomNav = findViewById(R.id.bottom_nav);
        bottomNav.setSelectedItemId(R.id.nav_collections);

        bottomNav.setOnItemSelectedListener(item -> {
            int id = item.getItemId();
            if (id == R.id.nav_home) {
                startActivity(new Intent(this, DriverDashboardActivity.class));
                overridePendingTransition(0, 0);
                return true;
            } else if (id == R.id.nav_collections) {
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

    @Override
    protected void onResume() {
        super.onResume();
        loadCollectionsData();
    }

    private void bindViews() {
        tvWelcome = findViewById(R.id.tv_welcome);
        tvTruckInfo = findViewById(R.id.tv_truck_info);
        etSearch = findViewById(R.id.et_search);
        filterAll = findViewById(R.id.filter_all);
        filterScheduled = findViewById(R.id.filter_scheduled);
        filterInProgress = findViewById(R.id.filter_in_progress);
        filterCompleted = findViewById(R.id.filter_completed);
        filterRejected = findViewById(R.id.filter_rejected);
        collectionsContainer = findViewById(R.id.collections_container);
        tvCollectionsEmpty = findViewById(R.id.tv_collections_empty);

        setupFilters();
        setupSearch();
    }

    private void loadCollectionsData() {
        FirebaseUser currentUser = FirebaseAuth.getInstance().getCurrentUser();
        if (currentUser == null) {
            allCollections.clear();
            renderCollections();
            tvCollectionsEmpty.setText("Sign in to view collections");
            return;
        }

        String uid = currentUser.getUid();

        FirebaseDb.firestore()
                .collection("driver")
                .document(uid)
                .get()
                .addOnSuccessListener(driverDoc -> {
                    if (driverDoc != null && driverDoc.exists()) {
                        String name = safe(driverDoc.getString("fullName"));
                        String truck = safe(driverDoc.getString("truck"));
                        if (!name.isEmpty()) tvWelcome.setText("Welcome, " + name);
                        if (!truck.isEmpty()) tvTruckInfo.setText("Truck: " + truck);
                    }
                });

        FirebaseDb.firestore()
                .collection("pickups")
                .get()
                .addOnSuccessListener(qs -> {
                    allCollections.clear();
                    for (DocumentSnapshot d : qs.getDocuments()) {
                        String assignedDriverId = safe(d.getString("assignedDriverId"));
                        String driverId = safe(d.getString("driverId"));
                        String pickupDriverUid = safe(d.getString("driverUid"));
                        String assignedDriver = safe(d.getString("assignedTo"));

                        boolean belongsToDriver = uid.equals(assignedDriverId)
                                || uid.equals(driverId)
                                || uid.equals(pickupDriverUid)
                                || uid.equals(assignedDriver);
                        if (!belongsToDriver) continue;

                        allCollections.add(d);
                    }

                    allCollections.sort((a, b) -> Long.compare(pickMillis(b), pickMillis(a)));
                    renderCollections();
                })
                .addOnFailureListener(e -> {
                    allCollections.clear();
                    renderCollections();
                    tvCollectionsEmpty.setText("Failed to load collections");
                });
    }

    private void renderCollections() {
        collectionsContainer.removeAllViews();
        int shown = 0;

        for (DocumentSnapshot d : allCollections) {
            if (!matchesFilter(d)) continue;
            if (!matchesSearch(d)) continue;
            collectionsContainer.addView(buildCollectionCard(d, shown > 0));
            shown++;
        }

        tvCollectionsEmpty.setVisibility(shown == 0 ? TextView.VISIBLE : TextView.GONE);
    }

    private void setupSearch() {
        etSearch.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) { }

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                searchQuery = s == null ? "" : s.toString().trim().toLowerCase(Locale.getDefault());
                renderCollections();
            }

            @Override
            public void afterTextChanged(Editable s) { }
        });
    }

    private void setupFilters() {
        filterAll.setOnClickListener(v -> selectFilter("all"));
        filterScheduled.setOnClickListener(v -> selectFilter("scheduled"));
        filterInProgress.setOnClickListener(v -> selectFilter("in_progress"));
        filterCompleted.setOnClickListener(v -> selectFilter("completed"));
        filterRejected.setOnClickListener(v -> selectFilter("rejected"));
        selectFilter("all");
    }

    private void selectFilter(String filter) {
        selectedFilter = filter;
        updateFilterStyles();
        renderCollections();
    }

    private void updateFilterStyles() {
        styleFilterChip(filterAll, "all".equals(selectedFilter));
        styleFilterChip(filterScheduled, "scheduled".equals(selectedFilter));
        styleFilterChip(filterInProgress, "in_progress".equals(selectedFilter));
        styleFilterChip(filterCompleted, "completed".equals(selectedFilter));
        styleFilterChip(filterRejected, "rejected".equals(selectedFilter));
    }

    private void styleFilterChip(TextView tv, boolean selected) {
        tv.setBackgroundResource(selected ? R.drawable.bg_status_chip : R.drawable.bg_quick_action);
        int colorRes = selected ? R.color.primaryColor : R.color.grey_600;
        tv.setTextColor(getResources().getColor(colorRes, getTheme()));
        tv.setTypeface(tv.getTypeface(), selected ? android.graphics.Typeface.BOLD : android.graphics.Typeface.NORMAL);
    }

    private boolean matchesFilter(DocumentSnapshot d) {
        if ("all".equals(selectedFilter)) return true;
        String raw = safe(d.getString("status")).toLowerCase(Locale.getDefault());
        if (raw.isEmpty()) raw = "scheduled";
        return raw.equals(selectedFilter);
    }

    private boolean matchesSearch(DocumentSnapshot d) {
        if (searchQuery.isEmpty()) return true;
        String haystack = (
                d.getId() + " " +
                        firstNonEmpty(d.getString("address"), d.getString("pickupAddress"), d.getString("location")) + " " +
                        firstNonEmpty(d.getString("customerName"), d.getString("fullName"), d.getString("recyclerName")) + " " +
                        firstNonEmpty(d.getString("phone"), d.getString("phoneNumber"), d.getString("contact")) + " " +
                        firstNonEmpty(d.getString("materialType"), d.getString("wasteType"), d.getString("type")) + " " +
                        firstNonEmpty(d.getString("reference"), d.getString("submissionId")) + " " +
                        safe(d.getString("status"))
        ).toLowerCase(Locale.getDefault());
        return haystack.contains(searchQuery);
    }

    private LinearLayout buildCollectionCard(DocumentSnapshot d, boolean withTopMargin) {
        float density = getResources().getDisplayMetrics().density;
        int p16 = (int) (16 * density);
        int mb12 = (int) (12 * density);
        int mt6 = (int) (6 * density);

        String status = safe(d.getString("status"));
        String address = firstNonEmpty(d.getString("address"), d.getString("pickupAddress"), d.getString("location"));
        String customer = firstNonEmpty(d.getString("customerName"), d.getString("fullName"), d.getString("recyclerName"));
        String phone = firstNonEmpty(d.getString("customerPhone"), d.getString("phone"), d.getString("phoneNumber"), d.getString("contact"));
        String type = firstNonEmpty(d.getString("materialType"), d.getString("wasteType"), d.getString("type"));
        Long itemCount = d.getLong("itemCount");
        if (itemCount == null) itemCount = d.getLong("quantity");
        Double weightKg = d.getDouble("weightKg");
        Double amount = d.getDouble("amount");
        if (amount == null) amount = d.getDouble("rewardAmount");
        String ref = firstNonEmpty(d.getString("reference"), d.getString("submissionId"), d.getId());
        String imageUri = d.getString("imageUri");

        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setBackgroundResource(R.drawable.bg_notification_card);
        card.setPadding(p16, p16, p16, p16);
        LinearLayout.LayoutParams cardLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
        );
        if (withTopMargin) cardLp.topMargin = mb12;
        card.setLayoutParams(cardLp);

        TextView title = new TextView(this);
        title.setText("Collection #" + shortId(d.getId()) + "  •  " + formatStatus(status));
        title.setTextColor(getResources().getColor(R.color.black, getTheme()));
        title.setTextSize(14f);
        title.setTypeface(title.getTypeface(), android.graphics.Typeface.BOLD);
        card.addView(title);

        TextView line1 = new TextView(this);
        line1.setText("Date: " + formatTimestamp(pickMillis(d)));
        line1.setTextColor(getResources().getColor(R.color.grey_600, getTheme()));
        line1.setTextSize(12f);
        line1.setPadding(0, mt6, 0, 0);
        card.addView(line1);

        TextView line2 = new TextView(this);
        line2.setText("Address: " + (address.isEmpty() ? "-" : address));
        line2.setTextColor(getResources().getColor(R.color.grey_600, getTheme()));
        line2.setTextSize(12f);
        line2.setPadding(0, mt6, 0, 0);
        card.addView(line2);

        TextView line3 = new TextView(this);
        line3.setText("Customer: " + (customer.isEmpty() ? "-" : customer) + "  |  Phone: " + (phone.isEmpty() ? "-" : phone));
        line3.setTextColor(getResources().getColor(R.color.grey_600, getTheme()));
        line3.setTextSize(12f);
        line3.setPadding(0, mt6, 0, 0);
        card.addView(line3);

        TextView line4 = new TextView(this);
        line4.setText(String.format(
                Locale.getDefault(),
                "Type: %s  |  Items: %d  |  Weight: %.1f kg",
                type.isEmpty() ? "-" : type,
                itemCount != null ? itemCount : 0,
                weightKg != null ? weightKg : 0.0
        ));
        line4.setTextColor(getResources().getColor(R.color.grey_600, getTheme()));
        line4.setTextSize(12f);
        line4.setPadding(0, mt6, 0, 0);
        card.addView(line4);

        TextView line5 = new TextView(this);
        line5.setText(String.format(Locale.getDefault(), "Amount: LKR %.2f  |  Ref: %s", amount != null ? amount : 0.0, ref));
        line5.setTextColor(getResources().getColor(R.color.grey_600, getTheme()));
        line5.setTextSize(12f);
        line5.setPadding(0, mt6, 0, 0);
        card.addView(line5);

        if (imageUri != null && !imageUri.isEmpty()) {
            ImageView ivMaterial = new ImageView(this);
            LinearLayout.LayoutParams ivLp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    (int) (180 * density)
            );
            ivLp.topMargin = mt6 * 2;
            ivMaterial.setLayoutParams(ivLp);
            ivMaterial.setScaleType(ImageView.ScaleType.CENTER_CROP);
            card.addView(ivMaterial);
            
            Glide.with(this)
                    .load(imageUri)
                    .placeholder(R.drawable.bg_quick_action)
                    .into(ivMaterial);
        }

        if ("in_progress".equalsIgnoreCase(status) || "scheduled".equalsIgnoreCase(status)) {
            android.widget.Button btnScan = new android.widget.Button(this);
            btnScan.setText("Click to Scan QR Code");
            btnScan.setBackgroundTintList(android.content.res.ColorStateList.valueOf(getResources().getColor(R.color.primaryColor, getTheme())));
            btnScan.setTextColor(getResources().getColor(R.color.white, getTheme()));
            LinearLayout.LayoutParams btnLp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
            );
            btnLp.topMargin = mt6 * 3;
            btnScan.setLayoutParams(btnLp);
            
            String finalPickupId = d.getId();
            btnScan.setOnClickListener(v -> {
                pendingScanPickupId = finalPickupId;
                ScanOptions options = new ScanOptions();
                options.setDesiredBarcodeFormats(ScanOptions.QR_CODE);
                options.setPrompt("Scan Recycler's QR Code");
                options.setBeepEnabled(true);
                options.setOrientationLocked(false);
                qrLauncher.launch(options);
            });
            card.addView(btnScan);
        }

        return card;
    }

    private void completePickup(String pickupId) {
        FirebaseDb.firestore().collection("pickups").document(pickupId)
            .get()
            .addOnSuccessListener(d -> {
                if (!d.exists()) return;
                
                FirebaseDb.firestore().collection("pickups").document(pickupId)
                        .update("status", "completed")
                        .addOnSuccessListener(unused -> {
                            android.widget.Toast.makeText(this, "Pickup Completed & Securely Verified!", android.widget.Toast.LENGTH_SHORT).show();
                            
                            Double amount = d.getDouble("amount");
                            if (amount == null) amount = d.getDouble("rewardAmount");
                            if (amount == null) amount = 0.0;
                            
                            if (amount <= 0.0) {
                                // Driver gets a flat 200 LKR for completing a pickup
                                amount = 200.0;
                            }

                            String userId = safe(d.getString("userId"));
                            String driverId = FirebaseAuth.getInstance().getCurrentUser() != null 
                                    ? FirebaseAuth.getInstance().getCurrentUser().getUid() : "";
                                    
                            if (amount > 0 && (!userId.isEmpty() || !driverId.isEmpty())) {
                                java.util.Map<String, Object> earnings = new java.util.HashMap<>();
                                if (!userId.isEmpty()) {
                                    earnings.put("userId", userId);
                                }
                                if (!driverId.isEmpty()) {
                                    earnings.put("driverId", driverId);
                                }
                                earnings.put("amount", amount);
                                earnings.put("createdAtMillis", System.currentTimeMillis());
                                earnings.put("pickupId", pickupId);
                                earnings.put("description", "Material Collection Reward");
                                FirebaseDb.firestore().collection("earnings").add(earnings);
                            }
                            loadCollectionsData();
                        })
                        .addOnFailureListener(e -> android.widget.Toast.makeText(this, "Network error updating pickup", android.widget.Toast.LENGTH_SHORT).show());
            });
    }

    private long pickMillis(DocumentSnapshot d) {
        Long scheduled = d.getLong("scheduledAtMillis");
        if (scheduled != null) return scheduled;
        Long created = d.getLong("createdAtMillis");
        if (created != null) return created;
        return 0L;
    }

    private String formatTimestamp(long millis) {
        if (millis <= 0L) return "Date not available";
        Date d = new Date(millis);
        SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd h:mm a", Locale.getDefault());
        f.setTimeZone(TimeZone.getDefault());
        return f.format(d);
    }

    private String formatStatus(String raw) {
        if (raw == null || raw.trim().isEmpty()) return "Pending";
        String normalized = raw.replace('_', ' ').trim();
        if (normalized.length() == 1) return normalized.toUpperCase(Locale.getDefault());
        return normalized.substring(0, 1).toUpperCase(Locale.getDefault()) + normalized.substring(1).toLowerCase(Locale.getDefault());
    }

    private String shortId(String id) {
        if (id == null || id.isEmpty()) return "N/A";
        return id.length() <= 6 ? id : id.substring(0, 6).toUpperCase(Locale.getDefault());
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }

    private String firstNonEmpty(String... values) {
        if (values == null) return "";
        for (String value : values) {
            if (value != null && !value.trim().isEmpty()) return value.trim();
        }
        return "";
    }
}

