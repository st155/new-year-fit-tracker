// Temporary translation stub - returns English text for each key
export const t = (key: string, params?: Record<string, any>): string => {
  const translations: Record<string, string> = {
    // Navigation
    'navigation.home': 'Home',
    'navigation.dashboard': 'Dashboard',
    'navigation.challenges': 'Challenges',
    'navigation.progress': 'Progress',
    'navigation.goals': 'Goals',
    'navigation.habits': 'Habits',
    'navigation.body': 'Body',
    'navigation.fitnessData': 'Fitness Data',
    'navigation.integrations': 'Integrations',
    'navigation.feed': 'Feed',
    'navigation.clients': 'Clients',
    'navigation.profile': 'Profile',
    'navigation.settings': 'Settings',
    'navigation.logout': 'Logout',
    'navigation.leaderboard': 'Leaderboard',
    
    // Dashboard
    'dashboard.daysLeft': `${params?.count || 0} days left`,
    'dashboard.metrics.from_whoop': 'from Whoop',
    
    // Stats
    'stats.weight': 'Weight',
    'stats.pullUps': 'Pull-ups',
    'stats.benchPress': 'Bench Press',
    'stats.plank': 'Plank',
    'stats.pushUps': 'Push-ups',
    'stats.vo2max': 'VO₂max',
    'stats.run1km': '1km Run',
    'stats.bodyFat': 'Body Fat',
    
    // Metrics
    'metrics.bodyFat.title': 'BODY FAT',
    'metrics.bodyFat.subtitle': 'Body composition',
    'metrics.weight.title': 'WEIGHT',
    'metrics.weight.subtitle': 'Current weight',
    'metrics.vo2max.title': 'VO₂MAX',
    'metrics.vo2max.subtitle': 'Cardio fitness',
    'metrics.recovery.title': 'RECOVERY SCORE',
    'metrics.recovery.subtitle': 'Daily recovery',
    'metrics.steps.title': 'DAILY STEPS',
    'metrics.steps.subtitle': 'Activity level',
    
    // Extra Metrics
    'extraMetrics.sleep.title': 'SLEEP',
    'extraMetrics.sleep.subtitle': 'Sleep quality',
    'extraMetrics.strain.title': 'STRAIN',
    'extraMetrics.strain.subtitle': 'Daily strain',
    'extraMetrics.activeMin.title': 'ACTIVE MINUTES',
    'extraMetrics.activeMin.subtitle': 'Active time',
    'extraMetrics.calories.title': 'CALORIES',
    'extraMetrics.calories.subtitle': 'Energy burned',
    'extraMetrics.restHr.title': 'RESTING HR',
    'extraMetrics.restHr.subtitle': 'Heart rate',
    'extraMetrics.hydration.title': 'HYDRATION',
    'extraMetrics.hydration.subtitle': 'Water intake',
    'extraMetrics.workouts.title': 'WORKOUTS',
    'extraMetrics.workouts.subtitle': 'Training sessions',
    
    'extraMetrics.subtitles.avgPerNight': 'avg per night',
    'extraMetrics.subtitles.today': 'today',
    'extraMetrics.subtitles.thisWeek': 'this week',
    'extraMetrics.subtitles.dailyAvg': 'daily avg',
    'extraMetrics.subtitles.morningAvg': 'morning avg',
    'extraMetrics.subtitles.last7days': 'last 7 days',
    'extraMetrics.subtitles.thisMonth': 'this month',
    
    // Leaderboard
    'leaderboard.title': 'LEADERBOARD',
    'leaderboard.team': 'TEAM',
    'leaderboard.rank': 'RANK',
    
    // Quick Actions
    'quickActions.addMeasurement': 'Add Measurement',
    'quickActions.recordWorkout': 'Record Workout',
    'quickActions.uploadPhoto': 'Upload Progress Photo',
    'quickActions.viewProgress': 'View Progress',
    'quickActions.aiAnalysis': 'AI Analysis',
    'quickActions.newGoal': 'New Goal',
    'quickActions.progress': 'Progress',
    'quickActions.leaderboard': 'Leaderboard',
    'quickActions.data': 'Data',
    
    // Auth
    'auth.signIn': 'Sign In',
    'auth.signUp': 'Sign Up',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.username': 'Username',
    'auth.hero.title': 'Join the Elite',
    'auth.hero.subtitle': 'Track your progress, compete with others',
    
    // Onboarding
    'onboarding.steps.goals': 'Create Goals',
    'onboarding.steps.challenge': 'Join a Challenge',
    'onboarding.steps.devices': 'Connect Devices',
    'onboarding.steps.habits': 'Create Habits',
    
    // Create Goal
    'createGoalPage.tabs.custom': 'Custom Goal',
    'createGoalPage.tabs.likeOthers': 'Like Others',
    'createGoalPage.tabs.fromTrainer': 'From Trainer',
    'createGoalPage.goalName': 'Goal Name',
    'createGoalPage.goalType': 'Goal Type',
    'createGoalPage.targetValue': 'Target Value',
    'createGoalPage.targetUnit': 'Unit',
    'createGoalPage.create': 'Create Goal',
    'createGoalPage.toast.success': 'Goal created successfully',
    'createGoalPage.toast.error': 'Failed to create goal',
    
    // Common
    'common.loading': 'Loading...',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
  };

  return translations[key] || key;
};

export const useTranslation = () => ({ t });
