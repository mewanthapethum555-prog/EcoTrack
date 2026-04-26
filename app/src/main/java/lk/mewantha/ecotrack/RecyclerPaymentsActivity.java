package lk.mewantha.ecotrack;

import android.os.Bundle;
import android.content.Intent;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.ImageButton;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.firestore.DocumentSnapshot;
import com.google.firebase.firestore.QueryDocumentSnapshot;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import lk.mewantha.ecotrack.database.FirebaseDb;

public class RecyclerPaymentsActivity extends AppCompatActivity {
    private TextView tvPlanName;
    private TextView tvCompletedPeriod;
    private TextView tvRemainingCount;
    private TextView tvPlanDeadline;
    private LinearLayout planBasicBtn;
    private LinearLayout planPremiumBtn;
    private LinearLayout planEnterpriseBtn;
    // Shown only when there are no recent payments
    private LinearLayout plansPreviewContainer;
    private LinearLayout paymentHistoryContainer;
    private TextView tabPlans;
    private TextView tabHistory;
    private boolean userSelectedPaymentTab = false;
    private TextView tvPlanBasicDesc;
    private TextView tvPlanPremiumDesc;
    private TextView tvPlanEnterpriseDesc;
    private LinearLayout paymentsListContainer;
    private ImageView ivEmptyPayments;
    private TextView tvEmptyPayments;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_recycler_payments);
        
        seedPlansIfMissing();

        ImageButton btnBack = findViewById(R.id.btn_back_payments);
        btnBack.setOnClickListener(v -> finish());

        tvPlanName = findViewById(R.id.tv_plan_name);
        tvCompletedPeriod = findViewById(R.id.tv_completed_period);
        tvRemainingCount = findViewById(R.id.tv_remaining_count);
        tvPlanDeadline = findViewById(R.id.tv_plan_deadline);
        plansPreviewContainer = findViewById(R.id.plans_preview_container);
        paymentHistoryContainer = findViewById(R.id.payment_history_container);
        tabPlans = findViewById(R.id.tab_plans);
        tabHistory = findViewById(R.id.tab_history);
        tvPlanBasicDesc = findViewById(R.id.tv_plan_basic_desc);
        tvPlanPremiumDesc = findViewById(R.id.tv_plan_premium_desc);
        tvPlanEnterpriseDesc = findViewById(R.id.tv_plan_enterprise_desc);
        paymentsListContainer = findViewById(R.id.payments_list_container);
        ivEmptyPayments = findViewById(R.id.iv_empty_payments);
        tvEmptyPayments = findViewById(R.id.tv_empty_payments);

        // Checkout plan buttons (shown inside "Payment Plans" preview).
        planBasicBtn = findViewById(R.id.plan_basic_btn);
        planPremiumBtn = findViewById(R.id.plan_premium_btn);
        planEnterpriseBtn = findViewById(R.id.plan_enterprise_btn);

        if (planBasicBtn != null) planBasicBtn.setOnClickListener(v -> openCheckout("basic"));
        if (planPremiumBtn != null) planPremiumBtn.setOnClickListener(v -> openCheckout("premium"));
        if (planEnterpriseBtn != null) planEnterpriseBtn.setOnClickListener(v -> openCheckout("enterprise"));

        // Default to payment history; renderPayments() may switch to plans if needed.
        setTabSelected(false, false);
        if (tabPlans != null) tabPlans.setOnClickListener(v -> setTabSelected(true, true));
        if (tabHistory != null) tabHistory.setOnClickListener(v -> setTabSelected(false, true));

        loadPaymentsData();
    }

    @Override
    protected void onResume() {
        super.onResume();
        loadPaymentsData();
    }

    private void seedPlansIfMissing() {
        FirebaseDb.firestore().collection("subscription_plans").document("basic").get()
                .addOnSuccessListener(documentSnapshot -> {
                    if (!documentSnapshot.exists()) {
                        // Seed Basic
                        Map<String, Object> basic = new HashMap<>();
                        basic.put("price", 1000.0);
                        basic.put("validDays", 30L);
                        basic.put("pickupLimit", 4L);
                        FirebaseDb.firestore().collection("subscription_plans").document("basic").set(basic);

                        // Seed Premium
                        Map<String, Object> premium = new HashMap<>();
                        premium.put("price", 2500.0);
                        premium.put("validDays", 30L);
                        premium.put("pickupLimit", 10L);
                        FirebaseDb.firestore().collection("subscription_plans").document("premium").set(premium);

                        // Seed Enterprise
                        Map<String, Object> enterprise = new HashMap<>();
                        enterprise.put("price", 5000.0);
                        enterprise.put("validDays", 30L);
                        enterprise.put("pickupLimit", 30L);
                        FirebaseDb.firestore().collection("subscription_plans").document("enterprise").set(enterprise);
                        
                        // Reload cards now that it's seeded!
                        loadPlanCards();
                    }
                });
    }

    private void loadPaymentsData() {
        FirebaseUser current = FirebaseAuth.getInstance().getCurrentUser();
        if (current == null) {
            bindDefaultState();
            tvEmptyPayments.setText("Please login to view payments.");
            tvEmptyPayments.setVisibility(View.VISIBLE);
            ivEmptyPayments.setVisibility(View.VISIBLE);
            return;
        }
        String uid = current.getUid();

        FirebaseDb.firestore()
                .collection("users")
                .document(uid)
                .get()
                .addOnSuccessListener(userDoc -> loadPlanAndUsage(userDoc, uid));

        FirebaseDb.firestore()
                .collection("payments")
                .get()
                .addOnSuccessListener(qs -> {
                    List<PaymentRow> rows = new ArrayList<>();
                    for (QueryDocumentSnapshot d : qs) {
                        if (!belongsToUser(d, uid)) continue;
                        Double amount = d.getDouble("amount");
                        Long createdAtMillis = d.getLong("createdAtMillis");
                        rows.add(new PaymentRow(
                                createdAtMillis != null ? createdAtMillis : 0L,
                                amount != null ? amount : 0.0
                        ));
                    }
                    rows.sort((a, b) -> Long.compare(b.createdAtMillis, a.createdAtMillis));
                    renderPayments(rows);
                })
                .addOnFailureListener(e -> renderPayments(new ArrayList<>()));
    }

    private void loadPlanAndUsage(DocumentSnapshot userDoc, String uid) {
        String planId = normalizePlan(firstNonEmpty(
                userDoc.getString("subscriptionPlanId"),
                userDoc.getString("planId"),
                userDoc.getString("tier")
        ));
        if (planId.isEmpty()) {
            tvPlanName.setText("None");
            tvCompletedPeriod.setText("0");
            tvRemainingCount.setText("—");
            tvPlanDeadline.setText("Plan deadline: —");
            return;
        }

        String planLabel = capitalize(planId);
        tvPlanName.setText(planLabel);

        FirebaseDb.firestore()
                .collection("subscription_plans")
                .document(planId)
                .get()
                .addOnSuccessListener(planDoc -> {
                    Long pickupLimit = planDoc.getLong("pickupLimit");
                    Long validDays = planDoc.getLong("validDays");
                    long planStart = firstLong(userDoc, "subscriptionStartedAtMillis", "planStartedAtMillis", "createdAtMillis");

                    loadCompletedCountForPeriod(uid, completed -> {
                        tvCompletedPeriod.setText(String.valueOf(completed));
                        if (pickupLimit != null && pickupLimit > 0) {
                            long remaining = Math.max(0, pickupLimit - completed);
                            tvRemainingCount.setText(String.valueOf(remaining));
                        } else {
                            tvRemainingCount.setText("—");
                        }

                        if (planStart > 0 && validDays != null && validDays > 0) {
                            long deadline = planStart + validDays * 24L * 60L * 60L * 1000L;
                            tvPlanDeadline.setText("Plan deadline: " + formatCountdown(deadline));
                        } else {
                            tvPlanDeadline.setText("Plan deadline: —");
                        }
                    });
                })
                .addOnFailureListener(e -> {
                    tvCompletedPeriod.setText("0");
                    tvRemainingCount.setText("—");
                    tvPlanDeadline.setText("Plan deadline: —");
                });
    }

    private void loadCompletedCountForPeriod(String uid, CountCallback cb) {
        long monthStart = startOfMonth(System.currentTimeMillis());
        FirebaseDb.firestore()
                .collection("pickups")
                .get()
                .addOnSuccessListener(qs -> {
                    int completed = 0;
                    for (QueryDocumentSnapshot d : qs) {
                        if (!belongsToUser(d, uid)) continue;
                        String status = firstNonEmpty(d.getString("status"));
                        Long scheduledAt = d.getLong("scheduledAtMillis");
                        long when = scheduledAt != null ? scheduledAt : 0L;
                        if ("completed".equalsIgnoreCase(status) && when >= monthStart) {
                            completed++;
                        }
                    }
                    cb.onDone(completed);
                })
                .addOnFailureListener(e -> cb.onDone(0));
    }

    private void renderPayments(List<PaymentRow> rows) {
        paymentsListContainer.removeAllViews();
        boolean empty = rows == null || rows.isEmpty();

        ivEmptyPayments.setVisibility(empty ? View.VISIBLE : View.GONE);
        tvEmptyPayments.setVisibility(empty ? View.VISIBLE : View.GONE);

        if (!empty) {
            int shown = Math.min(20, rows.size());
            for (int i = 0; i < shown; i++) {
                PaymentRow row = rows.get(i);
                View item = LayoutInflater.from(this).inflate(R.layout.item_payment_row, paymentsListContainer, false);
                TextView tvTime = item.findViewById(R.id.tv_payment_time);
                TextView tvAmount = item.findViewById(R.id.tv_payment_amount);
                tvTime.setText(formatDateTime(row.createdAtMillis));
                tvAmount.setText(String.format(Locale.getDefault(), "LKR %.2f", row.amount));
                paymentsListContainer.addView(item);
            }
        }

        // Auto-select tab only until the user taps a tab manually.
        if (!userSelectedPaymentTab) {
            setTabSelected(empty, false); // empty => show plans, else show history
        }
    }

    private void bindDefaultState() {
        tvPlanName.setText("None");
        tvCompletedPeriod.setText("0");
        tvRemainingCount.setText("—");
        tvPlanDeadline.setText("Plan deadline: —");
        setTabSelected(false, false);
        paymentsListContainer.removeAllViews();
        ivEmptyPayments.setVisibility(View.GONE);
        tvEmptyPayments.setVisibility(View.GONE);
    }

    private void showPlansPreview() {
        setTabSelected(true, false);
    }

    private void hidePlansPreview() {
        setTabSelected(false, false);
    }

    private void setTabSelected(boolean showPlans, boolean markUserSelection) {
        if (markUserSelection) {
            userSelectedPaymentTab = true;
        }

        if (plansPreviewContainer != null) {
            plansPreviewContainer.setVisibility(showPlans ? View.VISIBLE : View.GONE);
        }
        if (paymentHistoryContainer != null) {
            paymentHistoryContainer.setVisibility(showPlans ? View.GONE : View.VISIBLE);
        }

        updateTabStyles(showPlans);

        if (showPlans) {
            loadPlanCards();
        }
    }

    private void updateTabStyles(boolean showPlans) {
        if (tabPlans == null || tabHistory == null) return;

        if (showPlans) {
            tabPlans.setBackgroundResource(R.drawable.bg_payment_tab_selected);
            tabPlans.setTextColor(getColor(R.color.white));
            tabHistory.setBackgroundResource(R.drawable.bg_payment_tab_unselected);
            tabHistory.setTextColor(getColor(R.color.tab_unselected_text_color));
        } else {
            tabHistory.setBackgroundResource(R.drawable.bg_payment_tab_selected);
            tabHistory.setTextColor(getColor(R.color.white));
            tabPlans.setBackgroundResource(R.drawable.bg_payment_tab_unselected);
            tabPlans.setTextColor(getColor(R.color.tab_unselected_text_color));
        }
    }

    private void loadPlanCards() {
        loadPlanCard("basic", tvPlanBasicDesc);
        loadPlanCard("premium", tvPlanPremiumDesc);
        loadPlanCard("enterprise", tvPlanEnterpriseDesc);
    }

    private void openCheckout(String planId) {
        Intent i = new Intent(this, PlanCheckoutActivity.class);
        i.putExtra("planId", planId);
        startActivity(i);
    }

    private void loadPlanCard(String planId, TextView target) {
        if (target == null) return;
        target.setText("LKR - - days");

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

                    String priceText = priceD != null
                            ? String.format(Locale.getDefault(), "LKR %.2f", priceD)
                            : "LKR -";
                    String daysText = validDays != null ? validDays + " days" : "- days";

                    target.setText(priceText + " - " + daysText);
                })
                .addOnFailureListener(e -> target.setText("LKR - - days"));
    }

    private static boolean belongsToUser(DocumentSnapshot doc, String uid) {
        return uid.equals(firstNonEmpty(
                doc.getString("userId"),
                doc.getString("recyclerId"),
                doc.getString("ownerId")
        ));
    }

    private static String normalizePlan(String raw) {
        if (raw == null) return "";
        String v = raw.trim().toLowerCase(Locale.getDefault());
        if ("basic".equals(v) || "premium".equals(v) || "enterprise".equals(v)) return v;
        return "";
    }

    private static String firstNonEmpty(String... values) {
        if (values == null) return "";
        for (String v : values) {
            if (v != null && !v.trim().isEmpty()) return v.trim();
        }
        return "";
    }

    private static long firstLong(DocumentSnapshot doc, String... keys) {
        for (String key : keys) {
            Long v = doc.getLong(key);
            if (v != null && v > 0) return v;
        }
        return 0L;
    }

    private static String capitalize(String v) {
        if (v == null || v.isEmpty()) return v;
        if (v.length() == 1) return v.toUpperCase(Locale.getDefault());
        return v.substring(0, 1).toUpperCase(Locale.getDefault()) + v.substring(1).toLowerCase(Locale.getDefault());
    }

    private static long startOfMonth(long nowMillis) {
        Calendar cal = Calendar.getInstance();
        cal.setTimeInMillis(nowMillis);
        cal.set(Calendar.DAY_OF_MONTH, 1);
        cal.set(Calendar.HOUR_OF_DAY, 0);
        cal.set(Calendar.MINUTE, 0);
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);
        return cal.getTimeInMillis();
    }

    private String formatDateTime(long millis) {
        if (millis <= 0) return "Unknown date";
        return new SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault()).format(new Date(millis));
    }

    private String formatCountdown(long deadlineMillis) {
        long now = System.currentTimeMillis();
        long diff = deadlineMillis - now;
        if (diff <= 0) return "Expired";
        long days = diff / (24L * 60L * 60L * 1000L);
        long hours = (diff / (60L * 60L * 1000L)) % 24L;
        long minutes = (diff / (60L * 1000L)) % 60L;
        long seconds = (diff / 1000L) % 60L;
        return String.format(Locale.getDefault(), "%dd %dh %dm %ds", days, hours, minutes, seconds);
    }

    private interface CountCallback {
        void onDone(long completed);
    }

    private static final class PaymentRow {
        final long createdAtMillis;
        final double amount;

        PaymentRow(long createdAtMillis, double amount) {
            this.createdAtMillis = createdAtMillis;
            this.amount = amount;
        }
    }
}
