import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/poppins';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import BottomNav, { type TabKey } from './src/components/BottomNav';
import { ActivityProvider } from './src/lib/activity/ActivityContext';
import ActivityScreen from './src/screens/ActivityScreen';
import FocusScreen from './src/screens/FocusScreen';
import HomeScreen from './src/screens/HomeScreen';
import LecturesScreen from './src/screens/LecturesScreen';
import LoginScreen from './src/screens/LoginScreen';
import RoadmapScreen from './src/screens/RoadmapScreen';
import SubjectsScreen from './src/screens/SubjectsScreen';
import ToolsScreen from './src/screens/ToolsScreen';
import { colors, gradients } from './src/theme';
import { ToolHost } from './src/tools/ToolHost';
import type { ReadyToolId } from './src/tools/types';

type Screen = 'login' | TabKey;

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });
  const [screen, setScreen] = useState<Screen>('login');
  const [activeTool, setActiveTool] = useState<ReadyToolId | null>(null);
  const [roadmapOpen, setRoadmapOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);

  if (!fontsLoaded && !fontError) {
    return (
      <LinearGradient
        colors={gradients.mint}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.boot}
      >
        <ActivityIndicator color={colors.ink} />
      </LinearGradient>
    );
  }

  const switchTab = (key: TabKey) => {
    setRoadmapOpen(false);
    setActivityOpen(false);
    setScreen(key);
  };

  // The focus timer stays mounted across tabs, so a live session is only
  // "left" when the student actually goes somewhere else.
  const focusActive = screen === 'focus' && activeTool === null && !activityOpen;

  return (
    <SafeAreaProvider>
      <ActivityProvider>
        {screen === 'login' ? (
          <LoginScreen onLogin={() => setScreen('home')} />
        ) : (
          <View style={styles.app}>
            <StatusBar style="dark" />

            <View style={[styles.layer, !focusActive && styles.hidden]}>
              <FocusScreen active={focusActive} onOpenActivity={() => setActivityOpen(true)} />
            </View>

            {activeTool ? (
              <ToolHost toolId={activeTool} onClose={() => setActiveTool(null)} />
            ) : activityOpen ? (
              <ActivityScreen onBack={() => setActivityOpen(false)} />
            ) : (
              <>
                {screen === 'home' && (
                  <HomeScreen
                    onOpenActivity={() => setActivityOpen(true)}
                    onOpenTool={setActiveTool}
                  />
                )}
                {screen === 'lectures' && <LecturesScreen />}
                {screen === 'subjects' && <SubjectsScreen />}
                {screen === 'tools' &&
                  (roadmapOpen ? (
                    <RoadmapScreen onBack={() => setRoadmapOpen(false)} />
                  ) : (
                    <ToolsScreen
                      onOpenTool={setActiveTool}
                      onOpenRoadmap={() => setRoadmapOpen(true)}
                    />
                  ))}

                {!roadmapOpen ? (
                  <BottomNav active={screen} onChange={switchTab} />
                ) : null}
              </>
            )}
          </View>
        )}
      </ActivityProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  app: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  layer: {
    flex: 1,
  },
  hidden: {
    display: 'none',
  },
});
