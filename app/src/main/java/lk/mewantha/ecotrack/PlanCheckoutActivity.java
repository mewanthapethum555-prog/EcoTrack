package lk.mewantha.ecotrack;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.text.TextUtils;
import android.view.MenuItem;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;
// remove customtabs intent

import lk.payhere.androidsdk.PHConstants;
import lk.payhere.androidsdk.PHMainActivity;
import lk.payhere.androidsdk.PHResponse;
import lk.payhere.androidsdk.model.InitRequest;
import lk.payhere.androidsdk.model.Item;
import lk.payhere.androidsdk.model.StatusResponse;
import android.app.Activity;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.firestore.DocumentSnapshot;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.MessageDigest;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import lk.mewantha.ecotrack.database.FirebaseDb;

public class PlanCheckoutActivity extends AppCompatActivity {
    private TextView tvPlanLabel;
    private TextView tvAmount;

    private CheckBox cbUseName;
    private CheckBox cbUseEmail;
    private CheckBox cbUsePhone;
    private CheckBox cbUseAddress;

    private EditText etFirstName;
    private EditText etLastName;
    private EditText etEmail;
    private EditText etPhone;
    private EditText etAddress;
    private EditText etCity;

    private String savedFirstName = "";
    private String savedLastName = "";
    private String savedEmail = "";
    private String savedPhone = "";
    private String savedAddress = "";
    private String savedCity = "";
    private String selectedPlanId = "";
    private double selectedPlanPrice = 0.0;

    // PayHere sandbox credentials.
    // NOTE: Keep these synced with your current PayHere sandbox account.
    private static final String PAYHERE_MERCHANT_ID = "1234226";
    private static final String PAYHERE_MERCHANT_SECRET = "MjAzNDIyNzQ1OTQ3ODE1OTY1MzE2Njc5Nzk0MDU1MzY2NTcwOQ==";
    private static final String PAYHERE_CHECKOUT_URL = "https://sandbox.payhere.lk/pay/checkout";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_plan_checkout);

        Toolbar toolbar = findViewById(R.id.toolbar_checkout);
        setSupportActionBar(toolbar);
        if (getSupportActionBar() != null) {
            getSupportActionBar().setDisplayHomeAsUpEnabled(true);
        }

        tvPlanLabel = findViewById(R.id.tv_plan_label_checkout);
        tvAmount = findViewById(R.id.tv_amount_checkout);

        cbUseName = findViewById(R.id.cbUseName);
        cbUseEmail = findViewById(R.id.cbUseEmail);
        cbUsePhone = findViewById(R.id.cbUsePhone);
        cbUseAddress = findViewById(R.id.cbUseAddress);

        etFirstName = findViewById(R.id.etFirstName);
        etLastName = findViewById(R.id.etLastName);
        etEmail = findViewById(R.id.etEmail);
        etPhone = findViewById(R.id.etPhone);
        etAddress = findViewById(R.id.etAddress);
        etCity = findViewById(R.id.etCity);

        Button btnConfirm = findViewById(R.id.btnConfirmDetails);
        btnConfirm.setOnClickListener(v -> onConfirm());

        cbUseName.setOnCheckedChangeListener((buttonView, isChecked) -> {
            if (isChecked) {
                etFirstName.setText(savedFirstName);
                etLastName.setText(savedLastName);
            }
            setEnabledForName(isChecked ? false : true);
        });

        cbUseEmail.setOnCheckedChangeListener((buttonView, isChecked) -> {
            if (isChecked) etEmail.setText(savedEmail);
            setEnabled(etEmail, !isChecked);
        });

        cbUsePhone.setOnCheckedChangeListener((buttonView, isChecked) -> {
            if (isChecked) etPhone.setText(savedPhone);
            setEnabled(etPhone, !isChecked);
        });

        cbUseAddress.setOnCheckedChangeListener((buttonView, isChecked) -> {
            if (isChecked) {
                etAddress.setText(savedAddress);
                etCity.setText(savedCity);
            }
            setEnabled(etAddress, !isChecked);
            setEnabled(etCity, !isChecked);
        });

        String planId = getIntent().getStringExtra("planId");
        if (planId == null) planId = "";
        selectedPlanId = planId;

        tvPlanLabel.setText(capitalize(planId));

        // Load plan price.
        FirebaseDb.firestore()
                .collection("subscription_plans")
                .document(planId)
                .get()
                .addOnSuccessListener(doc -> {
                    Double priceD = doc.getDouble("price");
                    if (priceD == null) {
                        Long priceL = doc.getLong("price");
                        priceD = priceL != null ? priceL.doubleValue() : null;
                    }
                    Long validDays = doc.getLong("validDays");
                    selectedPlanPrice = priceD != null ? priceD : 0.0;

                    String priceText = priceD != null ? String.format(Locale.getDefault(), "LKR %.2f", priceD) : "LKR -";
                    String daysText = validDays != null ? validDays + " days" : "- days";
                    tvAmount.setText(priceText + " - " + daysText);
                })
                .addOnFailureListener(e -> tvAmount.setText("LKR - - days"));

        // Load user profile and pre-fill fields.
        FirebaseUser current = FirebaseAuth.getInstance().getCurrentUser();
        if (current == null) {
            Toast.makeText(this, "Please login first", Toast.LENGTH_SHORT).show();
            finish();
            return;
        }

        String uid = current.getUid();
        FirebaseDb.firestore()
                .collection("users")
                .document(uid)
                .get()
                .addOnSuccessListener(userDoc -> applyUserProfile(userDoc));
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        if (item.getItemId() == android.R.id.home) {
            finish();
            return true;
        }
        return super.onOptionsItemSelected(item);
    }

    private void applyUserProfile(DocumentSnapshot userDoc) {
        String fullName = firstNonEmpty(userDoc.getString("fullName"), userDoc.getString("name"));
        String email = firstNonEmpty(userDoc.getString("email"));
        String phone = firstNonEmpty(userDoc.getString("phone"), userDoc.getString("phoneNumber"));
        String address = firstNonEmpty(userDoc.getString("address"));
        String city = firstNonEmpty(userDoc.getString("city"));

        // Split fullName into first/last.
        savedFirstName = "";
        savedLastName = "";
        if (!TextUtils.isEmpty(fullName)) {
            String[] parts = fullName.trim().split("\\s+");
            if (parts.length > 0) savedFirstName = parts[0];
            if (parts.length > 1) {
                StringBuilder sb = new StringBuilder();
                for (int i = 1; i < parts.length; i++) {
                    if (i > 1) sb.append(" ");
                    sb.append(parts[i]);
                }
                savedLastName = sb.toString();
            }
        }

        savedEmail = email != null ? email : "";
        savedPhone = phone != null ? phone : "";
        savedAddress = address != null ? address : "";
        savedCity = city != null ? city : "";

        // Pre-fill edit texts (and disable them when the checkbox is checked).
        etFirstName.setText(savedFirstName);
        etLastName.setText(savedLastName);
        etEmail.setText(savedEmail);
        etPhone.setText(savedPhone);
        etAddress.setText(savedAddress);
        etCity.setText(savedCity);

        cbUseName.setChecked(!TextUtils.isEmpty(savedFirstName) || !TextUtils.isEmpty(savedLastName));
        cbUseEmail.setChecked(!TextUtils.isEmpty(savedEmail));
        cbUsePhone.setChecked(!TextUtils.isEmpty(savedPhone));
        cbUseAddress.setChecked(!TextUtils.isEmpty(savedAddress) || !TextUtils.isEmpty(savedCity));

        // Apply enabled state based on checkbox defaults.
        setEnabledForName(!cbUseName.isChecked());
        setEnabled(etEmail, !cbUseEmail.isChecked());
        setEnabled(etPhone, !cbUsePhone.isChecked());
        setEnabled(etAddress, !cbUseAddress.isChecked());
        setEnabled(etCity, !cbUseAddress.isChecked());
    }

    private void onConfirm() {
        String first = etFirstName.getText() != null ? etFirstName.getText().toString().trim() : "";
        String last = etLastName.getText() != null ? etLastName.getText().toString().trim() : "";
        String email = etEmail.getText() != null ? etEmail.getText().toString().trim() : "";
        String phone = etPhone.getText() != null ? etPhone.getText().toString().trim() : "";
        String address = etAddress.getText() != null ? etAddress.getText().toString().trim() : "";
        String city = etCity.getText() != null ? etCity.getText().toString().trim() : "";

        if (TextUtils.isEmpty(first) || TextUtils.isEmpty(last)) {
            Toast.makeText(this, "Please enter your name", Toast.LENGTH_SHORT).show();
            return;
        }
        if (TextUtils.isEmpty(email)) {
            Toast.makeText(this, "Please enter your email", Toast.LENGTH_SHORT).show();
            return;
        }
        if (TextUtils.isEmpty(phone)) {
            Toast.makeText(this, "Please enter your phone number", Toast.LENGTH_SHORT).show();
            return;
        }
        if (TextUtils.isEmpty(address) || TextUtils.isEmpty(city)) {
            Toast.makeText(this, "Please enter your address and city", Toast.LENGTH_SHORT).show();
            return;
        }

        launchPayHereSandbox(first, last, email, phone, address, city);
    }

    private void setEnabledForName(boolean enabled) {
        setEnabled(etFirstName, enabled);
        setEnabled(etLastName, enabled);
    }

    private void setEnabled(EditText et, boolean enabled) {
        et.setEnabled(enabled);
        et.setFocusable(enabled);
        et.setFocusableInTouchMode(enabled);
    }

    private static String firstNonEmpty(String... values) {
        if (values == null) return "";
        for (String v : values) {
            if (v != null && !v.trim().isEmpty()) return v.trim();
        }
        return "";
    }

    private static String capitalize(String raw) {
        if (raw == null) return "";
        String v = raw.trim().toLowerCase(Locale.getDefault());
        if (v.isEmpty()) return "";
        return v.substring(0, 1).toUpperCase(Locale.getDefault()) + v.substring(1);
    }

    private void launchPayHereSandbox(
            String firstName,
            String lastName,
            String email,
            String phone,
            String address,
            String city
    ) {
        if (selectedPlanPrice <= 0.0) {
            Toast.makeText(this, "Invalid plan amount. Please try again.", Toast.LENGTH_SHORT).show();
            return;
        }

        String orderId = "ECOTRACK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.getDefault());
        String items = capitalize(selectedPlanId) + " Plan";

        InitRequest req = new InitRequest();
        req.setSandBox(true);
        req.setMerchantId(PAYHERE_MERCHANT_ID);
        req.setCurrency("LKR");
        req.setAmount(selectedPlanPrice);
        req.setOrderId(orderId);
        req.setItemsDescription(items);
        req.setCustom1("PlanCheckout");
        req.setCustom2(selectedPlanId);

        req.getCustomer().setFirstName(firstName);
        req.getCustomer().setLastName(lastName);
        req.getCustomer().setEmail(email);
        req.getCustomer().setPhone(phone);
        req.getCustomer().getAddress().setAddress(address);
        req.getCustomer().getAddress().setCity(city);
        req.getCustomer().getAddress().setCountry("Sri Lanka");
        
        req.getItems().add(new Item(null, items, 1, selectedPlanPrice));

        Intent intent = new Intent(this, PHMainActivity.class);
        intent.putExtra(PHConstants.INTENT_EXTRA_DATA, req);
        startActivityForResult(intent, 11010);
    }
    
    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == 11010) {
            if (resultCode == Activity.RESULT_OK && data != null && data.hasExtra(PHConstants.INTENT_EXTRA_RESULT)) {
                PHResponse<StatusResponse> response = (PHResponse<StatusResponse>) data.getSerializableExtra(PHConstants.INTENT_EXTRA_RESULT);
                if (response != null && response.isSuccess()) {
                    StatusResponse statusResponse = response.getData();
                    String paymentNo = String.valueOf(statusResponse.getPaymentNo());
                    
                    FirebaseUser currentUser = FirebaseAuth.getInstance().getCurrentUser();
                    if (currentUser != null) {
                        String uid = currentUser.getUid();
                        long now = System.currentTimeMillis();
                        
                        // Update User Document
                        Map<String, Object> userUpdates = new HashMap<>();
                        userUpdates.put("subscriptionPlanId", selectedPlanId);
                        userUpdates.put("subscriptionStartedAtMillis", now);
                        FirebaseDb.firestore().collection("users").document(uid).update(userUpdates);
                        
                        // Add Payment Record
                        Map<String, Object> paymentRecord = new HashMap<>();
                        paymentRecord.put("userId", uid);
                        paymentRecord.put("amount", selectedPlanPrice);
                        paymentRecord.put("createdAtMillis", now);
                        paymentRecord.put("paymentNo", paymentNo);
                        paymentRecord.put("planId", selectedPlanId);
                        
                        FirebaseDb.firestore().collection("payments").add(paymentRecord)
                                .addOnSuccessListener(dr -> {
                                    Toast.makeText(this, "Payment successful! Ref: " + paymentNo, Toast.LENGTH_LONG).show();
                                    finish();
                                })
                                .addOnFailureListener(e -> {
                                    Toast.makeText(this, "Payment processed, but record failed to save.", Toast.LENGTH_LONG).show();
                                    finish();
                                });
                    } else {
                        Toast.makeText(this, "Payment successful! Ref: " + paymentNo, Toast.LENGTH_LONG).show();
                        finish();
                    }
                } else {
                    String msg = (response != null && response.getData() != null) ? response.getData().getMessage() : "Unknown specific error";
                    Toast.makeText(this, "Payment failed: " + msg, Toast.LENGTH_LONG).show();
                }
            } else if (resultCode == Activity.RESULT_CANCELED) {
                Toast.makeText(this, "Payment Canceled", Toast.LENGTH_SHORT).show();
            }
        }
    }

    private static String formatAmount(double amount) {
        BigDecimal bd = new BigDecimal(amount).setScale(2, RoundingMode.HALF_UP);
        return bd.toPlainString();
    }

    private static String buildPayHereHash(
            String merchantId,
            String orderId,
            String amount,
            String currency,
            String merchantSecret
    ) {
        String secretMd5 = md5Hex(merchantSecret).toUpperCase(Locale.getDefault());
        String raw = merchantId + orderId + amount + currency + secretMd5;
        return md5Hex(raw).toUpperCase(Locale.getDefault());
    }

    private static String md5Hex(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] digest = md.digest(input.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : digest) {
                sb.append(String.format(Locale.US, "%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            return "";
        }
    }

    private static String decodeBase64IfPossible(String maybeBase64) {
        try {
            byte[] bytes = android.util.Base64.decode(maybeBase64, android.util.Base64.DEFAULT);
            String decoded = new String(bytes, java.nio.charset.StandardCharsets.UTF_8).trim();
            return decoded.isEmpty() ? maybeBase64 : decoded;
        } catch (Exception e) {
            return maybeBase64;
        }
    }
}

