package com.smartflightcompanion.mobile.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.smartflightcompanion.mobile.ui.screens.flight.FlightDetailsScreen
import com.smartflightcompanion.mobile.ui.screens.home.HomeScreen
import com.smartflightcompanion.mobile.ui.screens.register.RegisterScreen
import com.smartflightcompanion.mobile.ui.screens.welcome.WelcomeScreen

@Composable
fun AppNavHost() {
    val navController = rememberNavController()

    NavHost(
        navController = navController,
        startDestination = AppRoute.Welcome.path
    ) {
        composable(AppRoute.Welcome.path) {
            WelcomeScreen(
                onNavigateToRegister = {
                    navController.navigate(AppRoute.Register.path) { launchSingleTop = true }
                },
                // Admins also land on Home until the admin console is migrated.
                onLoggedIn = { navController.navigateToHome() }
            )
        }
        composable(AppRoute.Register.path) {
            RegisterScreen(
                onNavigateToLogin = {
                    if (!navController.popBackStack(AppRoute.Welcome.path, inclusive = false)) {
                        navController.navigate(AppRoute.Welcome.path) {
                            popUpTo(AppRoute.Register.path) { inclusive = true }
                        }
                    }
                },
                onRegisteredAsUser = { navController.navigateToHome() }
            )
        }
        composable(AppRoute.Home.path) {
            HomeScreen(
                onOpenFlight = { flightId -> navController.navigate(AppRoute.FlightDetails.create(flightId)) },
                onSignedOut = {
                    navController.navigate(AppRoute.Welcome.path) {
                        popUpTo(navController.graph.id) { inclusive = true }
                    }
                }
            )
        }
        composable(
            route = AppRoute.FlightDetails.path,
            arguments = listOf(navArgument(AppRoute.FlightDetails.ARG_FLIGHT_ID) { type = NavType.StringType })
        ) { entry ->
            FlightDetailsScreen(
                flightId = entry.arguments?.getString(AppRoute.FlightDetails.ARG_FLIGHT_ID).orEmpty(),
                onBack = { navController.popBackStack() }
            )
        }
    }
}

/** Home becomes the only destination so Back exits the app instead of returning to auth screens. */
private fun NavHostController.navigateToHome() {
    navigate(AppRoute.Home.path) {
        popUpTo(graph.id) { inclusive = true }
    }
}
