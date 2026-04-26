package lk.mewantha.ecotrack;

import android.Manifest;
import android.app.DatePickerDialog;
import android.app.TimePickerDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.provider.MediaStore;
import android.text.TextUtils;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;

import com.google.android.material.bottomnavigation.BottomNavigationView;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.storage.FirebaseStorage;
import com.google.firebase.storage.StorageReference;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public class RecyclerSubmitActivity extends AppCompatActivity {

    private BottomNavigationView bottomNav;
    private static final int REQ_CAMERA = 1001;
    private android.graphics.Bitmap capturedBitmap = null;

    private final androidx.activity.result.ActivityResultLauncher<Intent> cameraLauncher = registerForActivityResult(
            new androidx.activity.result.contract.ActivityResultContracts.StartActivityForResult(),
            result -> {
                if (result.getResultCode() == RESULT_OK && result.getData() != null) {
                    Bundle extras = result.getData().getExtras();
                    if (extras != null) {
                        capturedBitmap = (android.graphics.Bitmap) extras.get("data");
                        Toast.makeText(this, "Image captured successfully", Toast.LENGTH_SHORT).show();
                    }
                }
            });

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_recycler_submit);

        Toolbar toolbar = findViewById(R.id.toolbar);
        if (toolbar != null) {
            setSupportActionBar(toolbar);
            toolbar.setNavigationOnClickListener(v -> onBackPressed());
        }

        // Setup bottom navigation
        bottomNav = findViewById(R.id.recycler_bottom_nav);
        bottomNav.setSelectedItemId(R.id.nav_recycler_submit);

        bottomNav.setOnItemSelectedListener(item -> {
            int itemId = item.getItemId();
            if (itemId == R.id.nav_recycler_home) {
                startActivity(new Intent(RecyclerSubmitActivity.this, RecyclerDashboardActivity.class));
                overridePendingTransition(0, 0);
                finish();
                return true;
            } else if (itemId == R.id.nav_recycler_learn) {
                startActivity(new Intent(RecyclerSubmitActivity.this, RecyclerLearnActivity.class));
                overridePendingTransition(0, 0);
                finish();
                return true;
            } else if (itemId == R.id.nav_recycler_submit) {
                return true;
            } else if (itemId == R.id.nav_recycler_profile) {
                startActivity(new Intent(RecyclerSubmitActivity.this, RecyclerProfileActivity.class));
                overridePendingTransition(0, 0);
                finish();
                return true;
            }
            return false;
        });

        Button btnSubmit = findViewById(R.id.btnSubmitItem);
        CheckBox cbPaper = findViewById(R.id.cbPaper);
        CheckBox cbGlass = findViewById(R.id.cbGlass);
        CheckBox cbMetal = findViewById(R.id.cbMetal);
        CheckBox cbPlastic = findViewById(R.id.cbPlastic);
        EditText etDescription = findViewById(R.id.etDescription);
        EditText etWeight = findViewById(R.id.etWeight);
        TextView tvPickupDateValue = findViewById(R.id.tvPickupDateValue);
        TextView tvPreferredTimeValue = findViewById(R.id.tvPreferredTimeValue);

        findViewById(R.id.layoutImageUpload).setOnClickListener(v -> openCamera());
        findViewById(R.id.tvPickupDateValue).setOnClickListener(v -> showDatePicker(tvPickupDateValue));
        findViewById(R.id.layoutPreferredTime).setOnClickListener(v -> showTimePicker(tvPreferredTimeValue));

        btnSubmit.setOnClickListener(v -> {
            FirebaseUser current = FirebaseAuth.getInstance().getCurrentUser();
            if (current == null) {
                Toast.makeText(this, "Please login first", Toast.LENGTH_SHORT).show();
                return;
            }

            List<String> categories = new ArrayList<>();
            if (cbPaper.isChecked())
                categories.add("Paper");
            if (cbGlass.isChecked())
                categories.add("Glass");
            if (cbMetal.isChecked())
                categories.add("Metal Cans");
            if (cbPlastic.isChecked())
                categories.add("Plastic Bottles (Up to 2L)");

            String desc = etDescription.getText() != null ? etDescription.getText().toString().trim() : "";
            String weightStr = etWeight.getText() != null ? etWeight.getText().toString().trim() : "";
            String pickupDate = tvPickupDateValue.getText() != null ? tvPickupDateValue.getText().toString().trim()
                    : "";
            String preferredTime = tvPreferredTimeValue.getText() != null
                    ? tvPreferredTimeValue.getText().toString().trim()
                    : "";

            if (categories.isEmpty()) {
                Toast.makeText(this, "Please select at least one category", Toast.LENGTH_SHORT).show();
                return;
            }

            if (TextUtils.isEmpty(weightStr)) {
                Toast.makeText(this, "Please enter weight", Toast.LENGTH_SHORT).show();
                return;
            }

            if (!pickupDate.matches("\\d{4}-\\d{2}-\\d{2}")) {
                Toast.makeText(this, "Please select pickup date", Toast.LENGTH_SHORT).show();
                return;
            }

            // Prevent selecting past dates (must be today or future).
            try {
                SimpleDateFormat dayFmt = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault());
                dayFmt.setLenient(false);

                Calendar today = Calendar.getInstance();
                today.set(Calendar.HOUR_OF_DAY, 0);
                today.set(Calendar.MINUTE, 0);
                today.set(Calendar.SECOND, 0);
                today.set(Calendar.MILLISECOND, 0);

                long todayMidnightMs = today.getTimeInMillis();
                long selectedDayMidnightMs = dayFmt.parse(pickupDate).getTime();

                if (selectedDayMidnightMs < todayMidnightMs) {
                    Toast.makeText(this, "Pickup date can't be in the past", Toast.LENGTH_SHORT).show();
                    return;
                }
            } catch (ParseException e) {
                Toast.makeText(this, "Please select a valid pickup date", Toast.LENGTH_SHORT).show();
                return;
            }

            if (!preferredTime.matches("\\d{2}:\\d{2}")) {
                Toast.makeText(this, "Please select preferred time", Toast.LENGTH_SHORT).show();
                return;
            }

            double weight;
            try {
                weight = Double.parseDouble(weightStr);
            } catch (NumberFormatException e) {
                Toast.makeText(this, "Invalid weight value", Toast.LENGTH_SHORT).show();
                return;
            }

            long scheduledAtMillis = 0L;
            try {
                String combined = pickupDate + " " + preferredTime;
                SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault());
                sdf.setLenient(false);
                scheduledAtMillis = sdf.parse(combined).getTime();
            } catch (ParseException e) {
                scheduledAtMillis = System.currentTimeMillis();
            }
            final long scheduledAtMillisFinal = scheduledAtMillis;

            // First upload image if exists, then save to Firestore
            if (capturedBitmap != null) {
                uploadImageAndSubmit(current.getUid(), categories, desc, weight, pickupDate, preferredTime,
                        scheduledAtMillisFinal);
            } else {
                submitToFirestore(current.getUid(), categories, desc, weight, pickupDate, preferredTime,
                        scheduledAtMillisFinal, null);
            }
        });
    }

    private void uploadImageAndSubmit(String uid, List<String> categories, String desc, double weight, String date,
            String time, long scheduledAt) {
        // We'll fetch the address in the final submit method to keep logic clean.
        // For now, just call common submit logic but with upload first.

        StorageReference storageRef = FirebaseStorage.getInstance().getReference()
                .child("submissions")
                .child(uid)
                .child(System.currentTimeMillis() + ".jpg");

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        capturedBitmap.compress(android.graphics.Bitmap.CompressFormat.JPEG, 90, baos);
        byte[] data = baos.toByteArray();

        Toast.makeText(this, "Uploading image...", Toast.LENGTH_SHORT).show();

        storageRef.putBytes(data)
                .addOnSuccessListener(taskSnapshot -> {
                    storageRef.getDownloadUrl()
                            .addOnSuccessListener(uri -> {
                                submitToFirestore(uid, categories, desc, weight, date, time, scheduledAt,
                                        uri.toString());
                            })
                            .addOnFailureListener(e -> {
                                Toast.makeText(this, "Failed to get download URL: " + e.getMessage(),
                                        Toast.LENGTH_SHORT).show();
                                submitToFirestore(uid, categories, desc, weight, date, time, scheduledAt, null);
                            });
                })
                .addOnFailureListener(e -> {
                    Toast.makeText(this, "Image upload failed: " + e.getMessage(), Toast.LENGTH_LONG).show();
                    // Still submit the data without an image if upload fails
                    submitToFirestore(uid, categories, desc, weight, date, time, scheduledAt, null);
                });
    }

    private void submitToFirestore(String uid, List<String> categories, String desc, double weight, String date,
            String time, long scheduledAt, String imageUri) {
        FirebaseFirestore.getInstance()
                .collection("users")
                .document(uid)
                .get()
                .addOnSuccessListener(userDoc -> {
                    String rawPlan = userDoc != null
                            ? firstNonEmpty(
                                    userDoc.getString("subscriptionPlanId"),
                                    userDoc.getString("planId"),
                                    userDoc.getString("tier"))
                            : "";
                    String normalizedPlan = normalizePlan(rawPlan);
                    if (TextUtils.isEmpty(normalizedPlan)) {
                        Toast.makeText(this, "You need an active plan to submit recycle items.", Toast.LENGTH_LONG)
                                .show();
                        return;
                    }

                    String userAddress = userDoc != null ? userDoc.getString("address") : null;
                    String userCity = userDoc != null ? userDoc.getString("city") : null;
                    String address = "";
                    if (userAddress != null && !userAddress.trim().isEmpty())
                        address = userAddress.trim();
                    if (userCity != null && !userCity.trim().isEmpty()) {
                        address = address.isEmpty() ? userCity.trim() : (address + ", " + userCity.trim());
                    }

                    Map<String, Object> doc = new HashMap<>();
                    doc.put("userId", uid);
                    doc.put("categories", categories);
                    doc.put("description", desc);
                    doc.put("weightKg", weight);
                    doc.put("pickupDateText", date);
                    doc.put("preferredTimeText", time);
                    doc.put("scheduledAtMillis", scheduledAt);
                    doc.put("address", address);
                    doc.put("status", "pending");
                    doc.put("approved", false);
                    doc.put("createdAtMillis", System.currentTimeMillis());

                    if (imageUri != null) {
                        doc.put("imageUri", imageUri);
                    }

                    FirebaseFirestore.getInstance()
                            .collection("submissions")
                            .add(doc)
                            .addOnSuccessListener(ref -> {
                                Toast.makeText(this, "Pickup scheduled successfully", Toast.LENGTH_SHORT).show();
                                finish();
                            })
                            .addOnFailureListener(e -> Toast
                                    .makeText(this, "Failed to submit: " + e.getMessage(), Toast.LENGTH_SHORT).show());
                });
    }

    private static String firstNonEmpty(String... values) {
        if (values == null)
            return "";
        for (String v : values) {
            if (v != null && !v.trim().isEmpty())
                return v.trim();
        }
        return "";
    }

    private static String normalizePlan(String raw) {
        if (raw == null)
            return "";
        String v = raw.trim().toLowerCase(Locale.getDefault());
        if ("basic".equals(v) || "premium".equals(v) || "enterprise".equals(v))
            return v;
        return "";
    }

    private void openCamera() {
        if (checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[] { Manifest.permission.CAMERA }, REQ_CAMERA);
            return;
        }
        try {
            Intent intent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
            cameraLauncher.launch(intent);
        } catch (ActivityNotFoundException e) {
            Toast.makeText(this, "Camera not available", Toast.LENGTH_SHORT).show();
        }
    }

    private void showDatePicker(TextView target) {
        Calendar c = Calendar.getInstance();
        int year = c.get(Calendar.YEAR);
        int month = c.get(Calendar.MONTH);
        int day = c.get(Calendar.DAY_OF_MONTH);

        // Only allow selecting today or future dates.
        Calendar today = Calendar.getInstance();
        today.set(Calendar.HOUR_OF_DAY, 0);
        today.set(Calendar.MINUTE, 0);
        today.set(Calendar.SECOND, 0);
        today.set(Calendar.MILLISECOND, 0);
        long minDateMillis = today.getTimeInMillis();

        DatePickerDialog dpd = new DatePickerDialog(this, (view, y, m, d) -> {
            String formatted = String.format(Locale.getDefault(), "%04d-%02d-%02d", y, m + 1, d);
            target.setText(formatted);
        }, year, month, day);

        dpd.getDatePicker().setMinDate(minDateMillis);
        dpd.show();
    }

    private void showTimePicker(TextView target) {
        final Calendar c = Calendar.getInstance();
        int hour = c.get(Calendar.HOUR_OF_DAY);
        int minute = c.get(Calendar.MINUTE);

        TimePickerDialog tpd = new TimePickerDialog(this, (view, h, m) -> {
            String formatted = String.format(Locale.getDefault(), "%02d:%02d", h, m);
            target.setText(formatted);
        }, hour, minute, true);
        tpd.show();
    }
}
