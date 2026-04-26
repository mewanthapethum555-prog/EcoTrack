package lk.mewantha.ecotrack;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.ImageView;
import androidx.appcompat.app.AppCompatActivity;
import com.bumptech.glide.Glide;

public class ChooseRoleActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_choose_role);

        ImageView imgSplash = findViewById(R.id.imgSplash);
        Glide.with(this)
                .asGif()
                .load(R.drawable.splash_animation)
                .into(imgSplash);

        View cardDriver = findViewById(R.id.cardDriver);
        View cardRecycler = findViewById(R.id.cardRecycler);

        cardDriver.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                startActivity(new Intent(ChooseRoleActivity.this, DriverLoginActivity.class));
            }
        });

        cardRecycler.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                startActivity(new Intent(ChooseRoleActivity.this, RecyclerLoginActivity.class));
            }
        });
    }
}
