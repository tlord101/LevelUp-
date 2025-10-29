export interface Mission {
  id: string;
  emoji: string;
  title: string;
  description: string;
  xp: number;
}

export const dailyMissions: Mission[] = [
  { id: 'foodScan', emoji: '🍎', title: 'Food Scan', description: 'Complete your first scan for +5 XP', xp: 5 },
  { id: 'bodyScan', emoji: '💪', title: 'Body Scan', description: 'Track your posture & stats for +8 XP', xp: 8 },
  { id: 'faceScan', emoji: '✨', title: 'Face Scan', description: 'Analyze your skin health for +6 XP', xp: 6 },
];