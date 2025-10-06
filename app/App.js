import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { StyleSheet, Text, View, TextInput, Button, ScrollView, Alert } from 'react-native';

const PROFILE_KEY = 'goalscoach:profile';

function getServerUrl() {
  if (Platform.OS === 'android') return 'http://10.0.2.2:4000';
  return 'http://localhost:4000';
}

export default function App() {
  const [goalsInput, setGoalsInput] = useState('');
  const [blockersInput, setBlockersInput] = useState('');
  const [timeInput, setTimeInput] = useState('09:00');
  const [prompt, setPrompt] = useState('');
  const [hasProfile, setHasProfile] = useState(false);
  const [loadingPrompt, setLoadingPrompt] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(PROFILE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setHasProfile(true);
        setGoalsInput((parsed.goals || []).join(', '));
        setBlockersInput((parsed.blockers || []).join(', '));
        setTimeInput(parsed.time || '09:00');
      }
    })();
  }, []);

  const goals = useMemo(() =>
    goalsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    [goalsInput]
  );

  const blockers = useMemo(() =>
    blockersInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    [blockersInput]
  );

  async function requestNotifPermissions() {
    const settings = await Notifications.getPermissionsAsync();
    if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED) {
      return true;
    }
    const req = await Notifications.requestPermissionsAsync();
    return req.granted || req.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED;
  }

  function parseTimeToTrigger(time) {
    const [hStr, mStr] = time.split(':');
    const hour = Number(hStr);
    const minute = Number(mStr);
    return { hour, minute };
  }

  async function scheduleDailyNotification(time) {
    const ok = await requestNotifPermissions();
    if (!ok) {
      Alert.alert('Permission needed', 'Enable notifications to receive daily prompts.');
      return;
    }
    const { hour, minute } = parseTimeToTrigger(time);
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Daily prompt',
        body: 'Open the app to get your AI prompt for today.',
      },
      trigger: { hour, minute, repeats: true },
    });
  }

  async function saveProfile() {
    const profile = { goals, blockers, time: timeInput };
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    await scheduleDailyNotification(timeInput);
    setHasProfile(true);
    Alert.alert('Saved', 'Your goals, blockers, and daily reminder are set.');
  }

  async function fetchPrompt() {
    try {
      setLoadingPrompt(true);
      const res = await fetch(`${getServerUrl()}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goals, blockers }),
      });
      const data = await res.json();
      if (res.ok) {
        setPrompt(data.prompt);
      } else {
        Alert.alert('Error', data?.error || 'Failed to generate prompt');
      }
    } catch (e) {
      Alert.alert('Network error', 'Make sure the server is running.');
    } finally {
      setLoadingPrompt(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Goals Coach</Text>
      <Text style={styles.label}>Your goals (comma separated)</Text>
      <TextInput
        style={styles.input}
        value={goalsInput}
        onChangeText={setGoalsInput}
        placeholder="e.g., Workout 20m, Read 10 pages"
      />
      <Text style={styles.label}>What's holding you back? (comma separated)</Text>
        <TextInput
        style={styles.input}
        value={blockersInput}
        onChangeText={setBlockersInput}
        placeholder="e.g., Procrastination, Perfectionism"
      />
      <Text style={styles.label}>Daily reminder time (HH:MM, 24h)</Text>
      <TextInput
        style={styles.input}
        value={timeInput}
        onChangeText={setTimeInput}
        placeholder="09:00"
        keyboardType="numbers-and-punctuation"
      />
      <View style={styles.row}>
        <Button title={hasProfile ? 'Update' : 'Save'} onPress={saveProfile} />
        <View style={{ width: 12 }} />
        <Button title={loadingPrompt ? 'Loading…' : 'Get Today\'s Prompt'} onPress={fetchPrompt} disabled={loadingPrompt} />
      </View>
      {!!prompt && (
        <View style={styles.promptBox}>
          <Text style={styles.promptText}>{prompt}</Text>
        </View>
      )}
      <StatusBar style="auto" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  promptBox: {
    marginTop: 16,
    backgroundColor: '#f2f2f2',
    padding: 12,
    borderRadius: 8,
  },
  promptText: {
    fontSize: 16,
  },
});
