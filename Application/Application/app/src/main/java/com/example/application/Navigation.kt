package com.example.application

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.compose.rememberNavController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import com.example.application.ui.theme.ApplicationTheme

sealed class Screen(val route: String) {
    object Home : Screen("home")
    object Task : Screen("task")
    object Budget : Screen("budget")
    object Setting : Screen("setting")
}
@Composable
fun MainScreen() {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    Scaffold(
        containerColor = Color.Black,
        bottomBar = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color.Black)
            ) {
                HorizontalDivider(thickness = 0.6.dp, color = Color.White.copy(alpha = 0.5f))
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color.Black)
                        .padding(vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceAround
                ) {
                    BottomNavItem(
                        painter = painterResource(R.drawable.outline_home_24),
                        label = "ホーム",
                        isSelected = currentRoute == Screen.Home.route,
                        onClick = { navController.navigate(Screen.Home.route) }
                    )
                    BottomNavItem(
                        painter = painterResource(R.drawable.outline_article_24),
                        label = "タスク",
                        isSelected = currentRoute == Screen.Task.route,
                        onClick = { navController.navigate(Screen.Task.route) }
                    )
                    BottomNavItem(
                        painter = painterResource(R.drawable.outline_account_balance_wallet_24),
                        label = "予算",
                        isSelected = currentRoute == Screen.Budget.route,
                        onClick = { navController.navigate(Screen.Budget.route) }
                    )
                    BottomNavItem(
                        painter = painterResource(R.drawable.outline_settings_24),
                        label = "設定",
                        isSelected = currentRoute == Screen.Setting.route,
                        onClick = { navController.navigate(Screen.Setting.route) }
                    )
                }
            }
        }
    ) { innerPadding ->

        NavHost( //画面切り替え
            navController = navController,
            startDestination = Screen.Home.route, //起動時にホームを開く
            modifier = Modifier
                .padding(innerPadding)
                .background(Color.Black)
        ) {
            composable(Screen.Home.route) { HomeScreen() } //ファイル関数
            composable(Screen.Task.route) { TaskScreen() }
            composable(Screen.Budget.route) { BudgetScreen() }
            composable(Screen.Setting.route) { SettingScreen() }
        }
    }
}

@Composable
fun BottomNavItem(
    painter: Painter,
    label: String,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    val color = if (isSelected) Color(0xFFEF2324) else Color.Gray
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .clickable { onClick() }
            .padding(vertical = 8.dp)
    ) {
        Icon(painter = painter, contentDescription = label, tint = color, modifier = Modifier.size(26.dp))
        Spacer(modifier = Modifier.height(4.dp))
        Text(text = label, color = color, fontSize = 10.sp)
    }
}

@Preview(showBackground = true)
@Composable
fun NavigationPreview() {
    ApplicationTheme {
        MainScreen()
    }
}