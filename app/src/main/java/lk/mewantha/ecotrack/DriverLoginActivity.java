package lk.mewantha.ecotrack;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.ImageButton;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.google.android.material.textfield.TextInputEditText;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;

import lk.mewantha.ecotrack.database.FirebaseDb;

public class DriverLoginActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_driver_login);

        ImageButton btnBack = findViewById(R.id.btn_back_driver_login);
        btnBack.setOnClickListener(v -> finish());

        TextInputEditText etDriverEmail = findViewById(R.id.etDriverEmail);
        TextInputEditText etDriverPassword = findViewById(R.id.etDriverPassword);
        Button btnLoginDriver = findViewById(R.id.btnLoginDriver);

        btnLoginDriver.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                String email = etDriverEmail.getText() != null ? etDriverEmail.getText().toString() : "";
                String password = etDriverPassword.getText() != null ? etDriverPassword.getText().toString() : "";

                if (email.isEmpty() || password.isEmpty()) {
                    Toast.makeText(DriverLoginActivity.this, "Please fill in all fields", Toast.LENGTH_SHORT).show();
                } else {
                    FirebaseAuth.getInstance()
                            .signInWithEmailAndPassword(email, password)
                            .addOnSuccessListener(authResult -> {
                                FirebaseUser user = authResult.getUser();
                                if (user == null) {
                                    Toast.makeText(DriverLoginActivity.this, "Login failed. Try again.", Toast.LENGTH_SHORT).show();
                                    return;
                                }

                                FirebaseDb.firestore()
                                        .collection("driver")
                                        .document(user.getUid())
                                        .get()
                                        .addOnSuccessListener(doc -> {
                                            String role = doc != null ? doc.getString("role") : null;
                                            if (!"driver".equals(role)) {
                                                FirebaseAuth.getInstance().signOut();
                                                Toast.makeText(DriverLoginActivity.this, "This is not a driver account", Toast.LENGTH_SHORT).show();
                                                return;
                                            }

                                            Toast.makeText(DriverLoginActivity.this, "Login successful", Toast.LENGTH_SHORT).show();
                                            startActivity(new Intent(DriverLoginActivity.this, DriverDashboardActivity.class));
                                            finish();
                                        })
                                        .addOnFailureListener(e -> Toast.makeText(DriverLoginActivity.this, "Failed to load profile: " + e.getMessage(), Toast.LENGTH_SHORT).show());
                            })
                            .addOnFailureListener(e -> Toast.makeText(DriverLoginActivity.this, "Invalid email or password", Toast.LENGTH_SHORT).show());
                }
            }
        });
    }
}
