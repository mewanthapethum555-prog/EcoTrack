package lk.mewantha.ecotrack;

import android.content.Intent;
import android.os.Bundle;
import android.util.Patterns;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.google.android.material.textfield.TextInputEditText;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import java.util.HashMap;
import java.util.Map;

import lk.mewantha.ecotrack.database.FirebaseDb;

public class RecyclerRegisterActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_recycler_register);

        TextInputEditText etRecyclerRegName = findViewById(R.id.etRecyclerRegName);
        TextInputEditText etRecyclerRegEmail = findViewById(R.id.etRecyclerRegEmail);
        TextInputEditText etRecyclerRegPassword = findViewById(R.id.etRecyclerRegPassword);
        TextInputEditText etRecyclerRegConfirmPassword = findViewById(R.id.etRecyclerRegConfirmPassword);
        TextInputEditText etRecyclerRegPhone = findViewById(R.id.etRecyclerRegPhone);
        TextInputEditText etRecyclerRegAddress = findViewById(R.id.etRecyclerRegAddress);
        TextInputEditText etRecyclerRegPostal = findViewById(R.id.etRecyclerRegPostal);

        Button btnRegister = findViewById(R.id.btnRegister);
        TextView tvGoToLogin = findViewById(R.id.tvGoToLogin);
        android.widget.ImageButton btnBack = findViewById(R.id.btn_back_recycler_register);

        btnBack.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                finish();
            }
        });

        btnRegister.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                String name = etRecyclerRegName.getText() != null ? etRecyclerRegName.getText().toString().trim() : "";
                String email = etRecyclerRegEmail.getText() != null ? etRecyclerRegEmail.getText().toString().trim() : "";
                String password = etRecyclerRegPassword.getText() != null ? etRecyclerRegPassword.getText().toString().trim() : "";
                String confirmPassword = etRecyclerRegConfirmPassword.getText() != null ? etRecyclerRegConfirmPassword.getText().toString().trim() : "";
                String phone = etRecyclerRegPhone.getText() != null ? etRecyclerRegPhone.getText().toString().trim() : "";
                String address = etRecyclerRegAddress.getText() != null ? etRecyclerRegAddress.getText().toString().trim() : "";
                String postalCode = etRecyclerRegPostal.getText() != null ? etRecyclerRegPostal.getText().toString().trim() : "";

                if (name.isEmpty() || email.isEmpty() || password.isEmpty() || confirmPassword.isEmpty()) {
                    Toast.makeText(RecyclerRegisterActivity.this, "Please fill in all required fields", Toast.LENGTH_SHORT).show();
                    return;
                }

                if (!Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
                    Toast.makeText(RecyclerRegisterActivity.this, "Please enter a valid email", Toast.LENGTH_SHORT).show();
                    return;
                }

                if (!password.equals(confirmPassword)) {
                    Toast.makeText(RecyclerRegisterActivity.this, "Passwords do not match", Toast.LENGTH_SHORT).show();
                    return;
                }

                if (password.length() < 6) {
                    Toast.makeText(RecyclerRegisterActivity.this, "Password must be at least 6 characters", Toast.LENGTH_SHORT).show();
                    return;
                }

                FirebaseAuth.getInstance()
                        .createUserWithEmailAndPassword(email, password)
                        .addOnSuccessListener(authResult -> {
                            FirebaseUser user = authResult.getUser();
                            if (user == null) {
                                Toast.makeText(RecyclerRegisterActivity.this, "Registration failed. Try again.", Toast.LENGTH_SHORT).show();
                                return;
                            }

                            Map<String, Object> doc = new HashMap<>();
                            doc.put("fullName", name);
                            doc.put("email", email);
                            doc.put("phone", phone);
                            doc.put("address", address);
                            doc.put("postalCode", postalCode);
                            // city/state/country can be parsed later or edited in profile
                            doc.put("city", "");
                            doc.put("state", "");
                            doc.put("country", "");
                            doc.put("role", "recycler");
                            doc.put("createdAtMillis", System.currentTimeMillis());

                            FirebaseDb.firestore()
                                    .collection("users")
                                    .document(user.getUid())
                                    .set(doc)
                                    .addOnSuccessListener(unused -> {
                                        Toast.makeText(RecyclerRegisterActivity.this, "Registration successful", Toast.LENGTH_SHORT).show();
                                        startActivity(new Intent(RecyclerRegisterActivity.this, RecyclerLoginActivity.class));
                                        finish();
                                    })
                                    .addOnFailureListener(e -> Toast.makeText(RecyclerRegisterActivity.this, "Failed to save profile: " + e.getMessage(), Toast.LENGTH_SHORT).show());
                        })
                        .addOnFailureListener(e -> Toast.makeText(RecyclerRegisterActivity.this, "Registration failed: " + e.getMessage(), Toast.LENGTH_SHORT).show());
            }
        });

        tvGoToLogin.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                startActivity(new Intent(RecyclerRegisterActivity.this, RecyclerLoginActivity.class));
                finish(); // Close register screen
            }
        });
    }
}
