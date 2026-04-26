package lk.mewantha.ecotrack;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.ImageButton;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.google.android.material.textfield.TextInputEditText;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;

import lk.mewantha.ecotrack.database.FirebaseDb;

public class RecyclerLoginActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_recycler_login);

        ImageButton btnBack = findViewById(R.id.btn_back_recycler_login);
        btnBack.setOnClickListener(v -> finish());

        TextInputEditText etRecyclerEmail = findViewById(R.id.etRecyclerEmail);
        TextInputEditText etRecyclerPassword = findViewById(R.id.etRecyclerPassword);
        Button btnLoginRecycler = findViewById(R.id.btnLoginRecycler);
        TextView tvGoToRegister = findViewById(R.id.tvGoToRegister);

        btnLoginRecycler.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                String email = etRecyclerEmail.getText() != null ? etRecyclerEmail.getText().toString().trim() : "";
                String password = etRecyclerPassword.getText() != null ? etRecyclerPassword.getText().toString().trim() : "";

                if (email.isEmpty() || password.isEmpty()) {
                    Toast.makeText(RecyclerLoginActivity.this, "Please fill in all fields", Toast.LENGTH_SHORT).show();
                    return;
                }

                FirebaseAuth.getInstance()
                        .signInWithEmailAndPassword(email, password)
                        .addOnSuccessListener(authResult -> {
                            FirebaseUser user = authResult.getUser();
                            if (user == null) {
                                Toast.makeText(RecyclerLoginActivity.this, "Login failed. Try again.", Toast.LENGTH_SHORT).show();
                                return;
                            }

                            FirebaseDb.firestore()
                                    .collection("users")
                                    .document(user.getUid())
                                    .get()
                                    .addOnSuccessListener(doc -> {
                                        String role = doc != null ? doc.getString("role") : null;
                                        if (!"recycler".equals(role)) {
                                            FirebaseAuth.getInstance().signOut();
                                            Toast.makeText(RecyclerLoginActivity.this, "This is not a recycler account", Toast.LENGTH_SHORT).show();
                                            return;
                                        }

                                        Toast.makeText(RecyclerLoginActivity.this, "Login successful", Toast.LENGTH_SHORT).show();
                                        startActivity(new Intent(RecyclerLoginActivity.this, RecyclerDashboardActivity.class));
                                        finish();
                                    })
                                    .addOnFailureListener(e -> Toast.makeText(RecyclerLoginActivity.this, "Failed to load profile: " + e.getMessage(), Toast.LENGTH_SHORT).show());
                        })
                        .addOnFailureListener(e -> Toast.makeText(RecyclerLoginActivity.this, "Invalid email or password", Toast.LENGTH_SHORT).show());
            }
        });

        tvGoToRegister.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                startActivity(new Intent(RecyclerLoginActivity.this, RecyclerRegisterActivity.class));
                finish(); // Close login screen
            }
        });
    }
}
