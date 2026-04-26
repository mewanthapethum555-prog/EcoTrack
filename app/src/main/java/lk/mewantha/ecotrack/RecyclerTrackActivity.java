package lk.mewantha.ecotrack;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.ImageButton;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.firestore.QueryDocumentSnapshot;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import lk.mewantha.ecotrack.database.FirebaseDb;

public class RecyclerTrackActivity extends AppCompatActivity {

    private LinearLayout trucksContainer;
    private TextView tvTrucksEmpty;

    private LinearLayout tabAll;
    private LinearLayout tabActive;
    private LinearLayout tabIdle;

    // 0=all, 1=active(in_progress), 2=idle(scheduled but not in_progress)
    private int currentTab = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_recycler_track);

        ImageButton btnBack = findViewById(R.id.btn_back_track);
        btnBack.setOnClickListener(v -> finish());

        trucksContainer = findViewById(R.id.trucks_container);
        tvTrucksEmpty = findViewById(R.id.tv_trucks_empty);

        tabAll = findViewById(R.id.tab_all_trucks);
        tabActive = findViewById(R.id.tab_active_trucks);
        tabIdle = findViewById(R.id.tab_idle_trucks);

        if (tabAll != null) tabAll.setOnClickListener(v -> {
            currentTab = 0;
            loadTrucks();
        });
        if (tabActive != null) tabActive.setOnClickListener(v -> {
            currentTab = 1;
            loadTrucks();
        });
        if (tabIdle != null) tabIdle.setOnClickListener(v -> {
            currentTab = 2;
            loadTrucks();
        });

        loadTrucks();
    }

    private void loadTrucks() {
        if (trucksContainer == null) return;
        trucksContainer.removeAllViews();
        if (tvTrucksEmpty != null) tvTrucksEmpty.setVisibility(View.GONE);

        FirebaseUser current = FirebaseAuth.getInstance().getCurrentUser();
        if (current == null) {
            if (tvTrucksEmpty != null) {
                tvTrucksEmpty.setText("Please login to track trucks.");
                tvTrucksEmpty.setVisibility(View.VISIBLE);
            }
            return;
        }

        String uid = current.getUid();

        FirebaseDb.firestore()
                .collection("pickups")
                .whereEqualTo("userId", uid)
                .get()
                .addOnSuccessListener(qs -> {
                    Map<String, TruckSummary> summaries = new HashMap<>();

                    for (QueryDocumentSnapshot doc : qs) {
                        Boolean approved = doc.getBoolean("approved");
                        if (!Boolean.TRUE.equals(approved)) continue; // show only admin-approved pickups

                        String status = safe(doc.getString("status"));
                        String driverId = safe(doc.getString("assignedDriverId"));
                        if (driverId.isEmpty()) driverId = safe(doc.getString("driverUid"));
                        if (driverId.isEmpty()) driverId = safe(doc.getString("assignedTo"));
                        if (driverId.isEmpty()) continue;

                        boolean isActivePickup = "in_progress".equalsIgnoreCase(status);
                        boolean isIdlePickup = "scheduled".equalsIgnoreCase(status);
                        if (!isActivePickup && !isIdlePickup) continue;

                        String address = firstNonEmpty(
                                doc.getString("address"),
                                doc.getString("pickupAddress"),
                                doc.getString("location")
                        );

                        TruckSummary s = summaries.get(driverId);
                        if (s == null) {
                            s = new TruckSummary(driverId);
                            summaries.put(driverId, s);
                        }
                        s.pickupIds.add(doc.getId());

                        if (isActivePickup) {
                            s.hasActive = true;
                            s.activeCount++;
                        } else if (isIdlePickup) {
                            s.hasScheduled = true;
                            s.scheduledCount++;
                        }

                        if (!address.isEmpty()) {
                            s.pickupAddress = address;
                        }
                    }

                    List<TruckSummary> filtered = new ArrayList<>();
                    for (TruckSummary s : summaries.values()) {
                        if (currentTab == 0) {
                            filtered.add(s);
                        } else if (currentTab == 1 && s.hasActive) {
                            filtered.add(s);
                        } else if (currentTab == 2 && !s.hasActive && s.hasScheduled) {
                            filtered.add(s);
                        }
                    }

                    if (filtered.isEmpty()) {
                        if (tvTrucksEmpty != null) {
                            tvTrucksEmpty.setText("No trucks found for this tab.");
                            tvTrucksEmpty.setVisibility(View.VISIBLE);
                        }
                        return;
                    }

                    // Fetch driver docs so we can show altitude/longitude/address and sort by GPS update time.
                    AtomicInteger remaining = new AtomicInteger(filtered.size());
                    for (TruckSummary s : filtered) {
                        FirebaseDb.firestore()
                                .collection("driver")
                                .document(s.driverId)
                                .get()
                                .addOnSuccessListener(doc -> {
                                    if (doc != null && doc.exists()) {
                                        s.driverFullName = firstNonEmpty(doc.getString("fullName"), doc.getString("name"));
                                        s.truck = safe(doc.getString("truck"));

                                        s.lastLatitude = doc.getDouble("lastLatitude");
                                        s.lastLongitude = doc.getDouble("lastLongitude");
                                        s.lastAltitude = doc.getDouble("lastAltitude");
                                        s.lastAddress = firstNonEmpty(doc.getString("lastAddress"));
                                        s.lastLocationUpdatedMillis = doc.getLong("lastLocationUpdatedMillis");
                                    }

                                    if (remaining.decrementAndGet() == 0) {
                                        filtered.sort((a, b) -> {
                                            long am = a.lastLocationUpdatedMillis != null ? a.lastLocationUpdatedMillis : 0L;
                                            long bm = b.lastLocationUpdatedMillis != null ? b.lastLocationUpdatedMillis : 0L;
                                            return Long.compare(bm, am); // newest first
                                        });
                                        for (TruckSummary st : filtered) {
                                            bindTruckCard(st);
                                        }
                                    }
                                })
                                .addOnFailureListener(e -> {
                                    if (remaining.decrementAndGet() == 0) {
                                        filtered.sort((a, b) -> {
                                            long am = a.lastLocationUpdatedMillis != null ? a.lastLocationUpdatedMillis : 0L;
                                            long bm = b.lastLocationUpdatedMillis != null ? b.lastLocationUpdatedMillis : 0L;
                                            return Long.compare(bm, am);
                                        });
                                        for (TruckSummary st : filtered) {
                                            bindTruckCard(st);
                                        }
                                    }
                                });
                    }
                })
                .addOnFailureListener(e -> {
                    if (tvTrucksEmpty != null) {
                        tvTrucksEmpty.setText("Failed to load trucks.");
                        tvTrucksEmpty.setVisibility(View.VISIBLE);
                    }
                });
    }

    private void bindTruckCard(TruckSummary summary) {
        View cardView = LayoutInflater.from(this).inflate(R.layout.item_truck_card, trucksContainer, false);
        TextView tvName = cardView.findViewById(R.id.tvTruckName);
        TextView tvMeta = cardView.findViewById(R.id.tvTruckMeta);
        TextView tvLocation = cardView.findViewById(R.id.tvTruckLocation);

        String shortId = summary.driverId.length() >= 4 ? summary.driverId.substring(0, 4) : summary.driverId;
        if (!summary.driverFullName.isEmpty()) {
            tvName.setText(summary.driverFullName);
        } else {
            tvName.setText("Truck " + shortId.toUpperCase(Locale.getDefault()));
        }

        String baseMeta = String.format(Locale.getDefault(),
                "Scheduled: %d • In progress: %d", summary.scheduledCount, summary.activeCount);

        String lonText = summary.lastLongitude != null ? String.format(Locale.getDefault(), "%.5f", summary.lastLongitude) : "—";
        String altText = summary.lastAltitude != null ? String.format(Locale.getDefault(), "%.1f m", summary.lastAltitude) : "—";

        String updatedText = summary.lastLocationUpdatedMillis != null
                ? formatRelativeTime(summary.lastLocationUpdatedMillis)
                : "GPS updated: —";

        String meta = baseMeta + " • Lon: " + lonText + " • Alt: " + altText + "\n" + updatedText;
        tvMeta.setText(meta);

        String address = firstNonEmpty(summary.lastAddress, summary.pickupAddress);
        tvLocation.setText(address.isEmpty() ? "—" : address);

        cardView.setOnClickListener(v -> {
            if (!summary.pickupIds.isEmpty()) {
                showQrPopup(summary.pickupIds.get(0));
            } else {
                android.widget.Toast.makeText(this, "No pickup ID available.", android.widget.Toast.LENGTH_SHORT).show();
            }
        });

        trucksContainer.addView(cardView);
    }

    private void showQrPopup(String pickupId) {
        String payload = "ECOTRACK-" + pickupId;
        try {
            com.journeyapps.barcodescanner.BarcodeEncoder qrEncoder = new com.journeyapps.barcodescanner.BarcodeEncoder();
            android.graphics.Bitmap bitmap = qrEncoder.encodeBitmap(payload, com.google.zxing.BarcodeFormat.QR_CODE, 600, 600);
            
            android.widget.ImageView imageView = new android.widget.ImageView(this);
            imageView.setImageBitmap(bitmap);
            int padding = (int) (24 * getResources().getDisplayMetrics().density);
            imageView.setPadding(padding, padding, padding, padding);

            new androidx.appcompat.app.AlertDialog.Builder(this)
                .setTitle("Pickup QR Code")
                .setMessage("Show this to your driver to securely complete the pickup.")
                .setView(imageView)
                .setPositiveButton("Close", null)
                .setNeutralButton("Save QR", (dialog, which) -> saveQrToGallery(bitmap, pickupId))
                .show();
        } catch (Exception e) {
            e.printStackTrace();
            android.widget.Toast.makeText(this, "Could not generate QR code", android.widget.Toast.LENGTH_SHORT).show();
        }
    }

    private void saveQrToGallery(android.graphics.Bitmap bitmap, String pickupId) {
        String filename = "EcoTrack_QR_" + pickupId + ".png";
        java.io.OutputStream fos;
        try {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
                android.content.ContentResolver resolver = getContentResolver();
                android.content.ContentValues contentValues = new android.content.ContentValues();
                contentValues.put(android.provider.MediaStore.MediaColumns.DISPLAY_NAME, filename);
                contentValues.put(android.provider.MediaStore.MediaColumns.MIME_TYPE, "image/png");
                contentValues.put(android.provider.MediaStore.MediaColumns.RELATIVE_PATH, android.os.Environment.DIRECTORY_PICTURES + "/EcoTrack");
                android.net.Uri imageUri = resolver.insert(android.provider.MediaStore.Images.Media.EXTERNAL_CONTENT_URI, contentValues);
                fos = resolver.openOutputStream(imageUri);
            } else {
                java.io.File imagesDir = android.os.Environment.getExternalStoragePublicDirectory(android.os.Environment.DIRECTORY_PICTURES);
                java.io.File ecoTrackDir = new java.io.File(imagesDir, "EcoTrack");
                if (!ecoTrackDir.exists()) ecoTrackDir.mkdirs();
                java.io.File imageFile = new java.io.File(ecoTrackDir, filename);
                fos = new java.io.FileOutputStream(imageFile);
            }
            if (fos != null) {
                bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG, 100, fos);
                fos.close();
                android.widget.Toast.makeText(this, "QR Code saved to Pictures/EcoTrack", android.widget.Toast.LENGTH_SHORT).show();
            }
        } catch (Exception e) {
            e.printStackTrace();
            android.widget.Toast.makeText(this, "Failed to save QR code to gallery", android.widget.Toast.LENGTH_SHORT).show();
        }
    }

    private String formatRelativeTime(long updatedMillis) {
        long now = System.currentTimeMillis();
        long diff = Math.max(0, now - updatedMillis);
        long sec = diff / 1000L;
        if (sec < 60) return "GPS updated: " + sec + "s ago";
        long min = sec / 60L;
        if (min < 60) return "GPS updated: " + min + "m ago";
        long hr = min / 60L;
        if (hr < 24) return "GPS updated: " + hr + "h ago";
        long d = hr / 24L;
        return "GPS updated: " + d + "d ago";
    }

    private static String safe(String v) {
        return v == null ? "" : v.trim();
    }

    private static String firstNonEmpty(String... values) {
        if (values == null) return "";
        for (String v : values) {
            if (v != null && !v.trim().isEmpty()) return v.trim();
        }
        return "";
    }

    private static final class TruckSummary {
        final String driverId;
        final List<String> pickupIds = new ArrayList<>();
        boolean hasActive = false;
        boolean hasScheduled = false;
        int activeCount = 0;
        int scheduledCount = 0;
        String pickupAddress = "";

        String driverFullName = "";
        String truck = "";
        Double lastLatitude = null;
        Double lastLongitude = null;
        Double lastAltitude = null;
        String lastAddress = "";
        Long lastLocationUpdatedMillis = null;

        TruckSummary(String driverId) {
            this.driverId = driverId;
        }
    }
}
