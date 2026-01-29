package com.example.application

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.VerticalDivider
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.application.ui.theme.ApplicationTheme

class BudgetActivity: ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            ApplicationTheme {
                BudgetScreen()
            }
        }
    }
}

@Composable
fun BudgetScreen() {
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
            Box( //ロゴ
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

            Spacer(modifier = Modifier.width(12.dp))

            Text(
                text = "Event Architect",
                color = Color.White,
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold
            )
        }

        Spacer(modifier = Modifier.height(20.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "収支明細",
                color = Color.White,
                fontSize = 28.sp,
                fontWeight = FontWeight.Bold
            )

            Surface( //項目追加
                color = Color(0xFF1A1A1A),
                shape = RoundedCornerShape(4.dp),
                modifier = Modifier.padding(vertical = 4.dp)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "+ 項目を追加する",
                        color = Color.White,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        Column( //明細カードリスト
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .verticalScroll(rememberScrollState()) //スクロール
        ) {
            BudgetCard(
                "会場費",
                "支出",
                "750,000",
                "800,000",
                "-¥50,000",
                isExpense = true
            )
            BudgetCard(
                "広告宣伝費",
                "支出",
                "500,000",
                "450,000",
                "+¥50,000",
                isExpense = true
            )
            BudgetCard(
                "備品・消耗品",
                "支出",
                "400,000",
                "350,000",
                "+¥50,000",
                isExpense = true
            )
            BudgetCard(
                "ゲスト謝礼・交通費",
                "支出",
                "600,000",
                "250,000",
                "+¥350,000",
                isExpense = true
            )
            BudgetCard(
                "チケット販売収入",
                "収入",
                "3,000,000",
                "1,200,000",
                "進行中",
                isExpense = false
            )

            Spacer(modifier = Modifier.height(20.dp))
        }
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(Color.Black)
                .padding(vertical = 12.dp)
        ) {
            TotalExpenditureCard("2,250,000", "1,850,000", "+¥400,000")
        }
    }
}

@Composable
fun BudgetCard( //カード
    title: String,
    type: String,
    budget: String,
    actual: String,
    diff: String,
    isExpense: Boolean
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 12.dp),
        colors = CardDefaults.cardColors(Color(0xFF1A1A1A)),
        shape = RoundedCornerShape(8.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = title,
                    color = Color.White,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = type,
                    color = if (isExpense) Color(0xFFEF2324) else Color.White,
                    fontSize = 12.sp
                )
            }

            Spacer(modifier = Modifier.height(12.dp))
            HorizontalDivider(thickness = 0.5.dp, color = Color.DarkGray)
            Spacer(modifier = Modifier.height(12.dp))

            Row(modifier = Modifier.fillMaxWidth()) {
                BudgetColumn("¥$budget", "予算", Modifier.weight(1f))
                VerticalDivider(Modifier.height(40.dp).padding(horizontal = 8.dp), thickness = 0.5.dp, color = Color.DarkGray)
                BudgetColumn("¥$actual", "実績", Modifier.weight(1f))
                VerticalDivider(Modifier.height(40.dp).padding(horizontal = 8.dp), thickness = 0.5.dp, color = Color.DarkGray)
                BudgetColumn(diff, "差分", Modifier.weight(1f), isHighlight = true)
            }
        }
    }
}

@Composable
fun TotalExpenditureCard(budget: String, actual: String, diff: String) { //下の合計支出
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp)
    ) {
        Text(
            text = "合計支出 (TOTAL EXPENDITURE)",
            color = Color.White,
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 8.dp)
        )
        Row(modifier = Modifier.fillMaxWidth()) {
            BudgetColumn("¥$budget", "予算", Modifier.weight(1f))
            VerticalDivider(Modifier.height(40.dp).padding(horizontal = 8.dp), thickness = 0.5.dp, color = Color.DarkGray)
            BudgetColumn("¥$actual", "実績", Modifier.weight(1f))
            VerticalDivider(Modifier.height(40.dp).padding(horizontal = 8.dp), thickness = 0.5.dp, color = Color.DarkGray)
            BudgetColumn(diff, "差分", Modifier.weight(1f), isHighlight = true)
        }
    }
}

@Composable
fun BudgetColumn(value: String, label: String, modifier: Modifier, isHighlight: Boolean = false) { //カードのお金
    Column(modifier = modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            text = value,
            color = if (isHighlight) Color(0xFFEF2324) else Color.White,
            fontSize = 16.sp,
            fontWeight = FontWeight.Bold
        )
        Text(
            text = label,
            color = Color.Gray,
            fontSize = 10.sp
        )
    }
}

@Preview(showBackground = true)
@Composable
fun BudgetPreview() {
    ApplicationTheme {
        BudgetScreen()
    }
}