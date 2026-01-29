package com.example.application

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.application.ui.theme.ApplicationTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            ApplicationTheme {
                MainScreen()
            }
        }
    }
}

@Composable
fun HomeScreen() {
    Column( //一番後ろ
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
            .padding(16.dp)
    ) {

        Spacer(modifier = Modifier.height(20.dp))

        Row( //Event Architect
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box( //赤丸
                modifier = Modifier
                    .size(24.dp)
                    .background(Color(0xFFEF2324), shape = CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "A",
                    color = Color.White,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold
                )
            }

            Spacer(modifier = Modifier.width(8.dp))

            Text(
                text = "Event Architect",
                color = Color.White,
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold
            )

            Spacer(modifier = Modifier.weight(1f))

            Box( //新規作成
                modifier = Modifier
                    .width(120.dp)
                    .height(35.dp)
                    .background(Color(0xFFEF2324), RoundedCornerShape(16.dp))
                    .padding(6.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "＋　新規作成",
                    color = Color.White,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }

        Spacer(modifier = Modifier.height(100.dp))

        Column( //中央縦軸
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "どのようなイベントを\n企画しますか?",
                color = Color.White,
                fontSize = 28.sp,
                fontWeight = FontWeight.ExtraBold,
                lineHeight = 36.sp,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center
            )

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "AIがあなたのビジョンを\n具体的なプランへと変換します。",
                color = Color.Gray,
                fontSize = 14.sp,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center
            )

            Spacer(modifier = Modifier.height(20.dp))

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(210.dp)
                    .background(Color(0xFF161616), RoundedCornerShape(16.dp))
                    .padding(16.dp)
            ) {
                Column { //文字入力スペース
                    Text(
                        text = "イベントの概要を入力してください...",
                        color = Color(0xFF46505A),
                        fontSize = 18.sp
                    )

                    Spacer(modifier = Modifier.height(80.dp))

                    HorizontalDivider( //薄い真ん中の線
                        modifier = Modifier.padding(vertical = 12.dp),
                        thickness = 0.2.dp,
                        color = Color.White
                    )

                    Row( //AI THINKING
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(8.dp)
                                    .background(Color(0xFFEF2324), CircleShape)
                            )

                            Spacer(modifier = Modifier.width(8.dp))

                            Text(
                                text = "AI THINKING",
                                color = Color(0xFFEF2324),
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }

                        Box( //矢印ボタン
                            modifier = Modifier
                                .size(50.dp)
                                .background(Color(0xFFEF2324), RoundedCornerShape(12.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                painter = painterResource(id = R.drawable.outline_arrow_right_alt_24),
                                contentDescription = "送信",
                                tint = Color.White,
                                modifier = Modifier.size(24.dp)
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            Row( //社内勉強会等のタブ
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()), //スクロール

            horizontalArrangement = Arrangement.spacedBy(8.dp) // タグの間の隙間
            ) {
                EventTag(
                    painter = painterResource(id = R.drawable.outline_checkbook_24),
                    label = "50人規模の社内勉強会"
                )
                EventTag(
                    painter = painterResource(id = R.drawable.outline_brand_awareness_24),
                    label = "新製品の発表イベント"
                )
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        Box( //SYSTEM STATUS
            modifier = Modifier
                .fillMaxWidth()
                .background(color = Color(0xFF161616), RoundedCornerShape(16.dp))
                .padding(16.dp)
        ) {
            Column {
                Text(
                    text = "SYSTEM STATUS",
                    color = Color.Gray,
                    fontSize = 12.sp,
                    modifier = Modifier.padding(bottom = 8.dp)
                )

                Box( //バー
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(6.dp)
                        .background(
                            color = Color.White.copy(alpha = 0.1f),
                            shape = CircleShape
                        )
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(fraction = 0.3f)
                            .fillMaxHeight()
                            .background(
                                color = Color(0xFFEF2324),
                                shape = CircleShape
                            )
                    )
                }
            }
        }
        Spacer(modifier = Modifier.weight(1f))
    }
}


@Composable
fun EventTag( //社内勉強会タブ
    painter: androidx.compose.ui.graphics.painter.Painter,
    label: String
) {
    Row(
        modifier = Modifier
            .background(
                color = Color.White.copy(alpha = 0.1f),
                shape = RoundedCornerShape(20.dp)
            )
            .padding(horizontal = 12.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            painter = painter,
            contentDescription = null,
            tint = Color.Gray,
            modifier = Modifier.size(30.dp)
        )

        Spacer(modifier = Modifier.width(8.dp))

        Text(
            text = label,
            color = Color.White,
            fontSize = 16.sp,
        )
    }
}

@Preview(showBackground = true)
@Composable
fun GreetingPreview() {
    ApplicationTheme {
        HomeScreen()
    }
}

//Column…縦軸
//Row…横軸
//spacer…スペース
//fillMaxWidth…画面いっぱいに表示
//padding…内側に間隔を開ける
//fontWeight = FontWeight.Bold…太字
//verticalAlignment…高さをどこに合わせるか
//horizontalArrangement…水平方向にどう並べるか