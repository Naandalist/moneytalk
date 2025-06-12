import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { useCurrency } from '@/context/CurrencyContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mic, CircleStop as StopCircle, CircleAlert as AlertCircle } from 'lucide-react-native';
import { useDatabase } from '@/context/DatabaseContext';
import { analyzeTransaction } from '@/utils/transactionAnalyzer';
import RecordingWaveform from '@/components/RecordingWaveform';
import TransactionConfirmation from '@/components/TransactionConfirmation';
import CustomNotification from '@/components/CustomNotification';
import { useNotification } from '@/hooks/useNotification';
import { Transaction } from '@/types/transaction';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { useAdMob } from '@/utils/admob';

// Mock function for audio transcription - in a real app, you'd connect to an API
const transcribeAudio = async (uri: string): Promise<string> => {
  try {
    const formData = new FormData();

    formData.append('file', {
      uri: uri,
      type: 'audio/m4a',
      name: 'recording.m4a'
    } as any);

    formData.append('model', 'whisper-1');
    formData.append('response_format', 'json');

    const openaiKey = Constants.expoConfig?.extra?.openaiApiKey || null;

    if (!openaiKey) {
      throw new Error('OpenAI API key not found');
    }

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || response.status}`);
    }

    const result = await response.json();
    return result.text || 'No transcription available';

  } catch (error) {
    console.error('Transcription error:', error);
    // Fallback to mock data in development or show user-friendly error
    if (__DEV__) {
      return "I spent 24 dollars on lunch today"; // Keep mock for development
    }
    throw new Error('Unable to transcribe audio. Please try again.');
  }
};

const MAX_RECORDING_DURATION = 20; // 20 seconds

export default function RecordScreen() {
  const { colors } = useTheme();
  const { selectedCurrency } = useCurrency();
  const insets = useSafeAreaInsets();
  const { addTransaction } = useDatabase();
  const {
    notification,
    hideNotification,
    showSuccess,
    showError,
    showWarning,
  } = useNotification();

  // Use the AdMob hook
  const { showAdWithDelay, isAdLoaded } = useAdMob(['food', 'car', 'fruit', 'finance', 'app', 'kids', 'family', 'cooking', 'travel']);

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [transcription, setTranscription] = useState('');
  const [parsedTransaction, setParsedTransaction] = useState<Transaction | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getRemainingTime = () => {
    return MAX_RECORDING_DURATION - recordingDuration;
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (recordingDuration >= MAX_RECORDING_DURATION && isRecording) {
      stopRecording();
    }
  }, [recordingDuration, isRecording]);

  async function startRecording() {
    try {
      // Request permissions
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        showWarning(
          'Permission Required',
          'You need to grant audio recording permissions to use this feature.'
        );
        return;
      }

      // Configure audio session
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Create and prepare recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setIsRecording(true);
      setRecordingDuration(0);

      // Start duration timer
      // @ts-expect-error
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Failed to start recording', err);
      showError('Recording Failed', 'There was an error starting the recording.');
    }
  }

  async function stopRecording() {
    if (!recording) return;

    try {
      // Stop the recording
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      // Get recording URI
      const uri = recording.getURI();
      if (!uri) {
        throw new Error('Recording URI is null');
      }

      // Process the recording
      setIsProcessing(true);

      try {
        // Transcribe audio
        const text = await transcribeAudio(uri);
        console.log('OpenAI transcribeAudio:', text);
        setTranscription(text);

        // Analyze the transcription to extract transaction details
        const parsedResult = await analyzeTransaction(text);

        // Validate the parsed result before setting state
        if (parsedResult && typeof parsedResult.amount === 'number' && parsedResult.category) {
          setParsedTransaction(parsedResult);
        } else {
          console.error('Invalid transaction result:', parsedResult);
          showError(
            'Processing Error',
            'Failed to extract transaction details. Please try again.'
          );
        }
      } catch (error) {
        console.error('Error processing audio:', error);
        showError(
          'Processing Error',
          'Failed to process your recording. Please try again.'
        );
      } finally {
        setIsProcessing(false);
        setRecording(null);
      }

    } catch (err) {
      console.error('Failed to stop recording', err);
      showError('Error', 'Failed to stop recording');
      setIsProcessing(false);
      setRecording(null);
    }
  }

  const handleSaveTransaction = async (transaction: Transaction) => {
    try {
      // Ensure the original transcription is preserved in the description
      const transactionWithText = {
        ...transaction,
        description: transcription || transaction.description || ''
      };

      await addTransaction(transactionWithText);

      // Success feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Reset state
      setTranscription('');
      setParsedTransaction(null);

      // Show success notification
      showSuccess('Success', 'Transaction saved successfully!', 2000);

      // Show AdMob interstitial ad with delay, then navigate
      await showAdWithDelay(2000, () => {
        router.replace('/');
      });
    } catch (error) {
      console.error('Error saving transaction:', error);
      showError('Error', 'Failed to save transaction. Please try again.');
    }
  };

  const handleCancel = () => {
    setTranscription('');
    setParsedTransaction(null);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <Text style={[styles.header, { color: colors.text }]}>Record Transaction</Text>

      {/* Custom notification */}
      <CustomNotification
        notification={notification}
        onClose={hideNotification}
      />

      {/* When we have a parsed transaction, show confirmation screen */}
      {parsedTransaction && parsedTransaction.amount !== undefined && parsedTransaction.category ? (
        <TransactionConfirmation
          transaction={parsedTransaction}
          onSave={handleSaveTransaction}
          onCancel={handleCancel}
        />
      ) : (
        <View style={styles.recordingContainer}>
          {/* Transcription result or instructions */}
          {isProcessing ? (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.processingText, { color: colors.textSecondary }]}>
                Processing your recording...
              </Text>
            </View>
          ) : transcription ? (
            <View style={[styles.transcriptionContainer, { backgroundColor: colors.cardAlt }]}>
              <Text style={[styles.transcriptionTitle, { color: colors.text }]}>Transcription:</Text>
              <Text style={[styles.transcriptionText, { color: colors.text }]}>
                {transcription}
              </Text>
              <View style={styles.transcriptionNote}>
                <AlertCircle size={16} color={colors.textSecondary} />
                <Text style={[styles.transcriptionNoteText, { color: colors.textSecondary }]}>
                  Processing failed. Please try recording again.
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.instructionsContainer}>
              <Text style={[styles.instructionsTitle, { color: colors.text }]}>
                {isRecording ? 'Recording...' : 'Record a Transaction'}
              </Text>
              <Text style={[styles.instructionsText, { color: colors.textSecondary }]}>
                {isRecording
                  ? 'Speak clearly about your transaction.'
                  : `Tap the microphone and describe your transaction.\nExample: "I spent ${selectedCurrency.symbol}24 on lunch today" or\n"I received ${selectedCurrency.symbol}2000 from my salary"`}
              </Text>
            </View>
          )}

          {isRecording && (
            <View style={styles.waveformContainer}>
              <RecordingWaveform />
              <Text style={[styles.duration, { color: colors.text }]}>
                {formatTime(recordingDuration)} / {formatTime(MAX_RECORDING_DURATION)}
              </Text>
              {getRemainingTime() <= (MAX_RECORDING_DURATION - 15) && getRemainingTime() > 0 && (
                <Text style={[styles.warning, { color: colors.error }]}>
                  {getRemainingTime()} seconds remaining
                </Text>
              )}
            </View>
          )}

          {/* Recording button */}
          {!isProcessing && (
            <TouchableOpacity
              style={[
                styles.recordButton,
                { backgroundColor: isRecording ? colors.error : colors.primary }
              ]}
              onPress={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
            >
              {isRecording ? (
                <StopCircle size={32} color={colors.white} />
              ) : (
                <Mic size={32} color={colors.white} />
              )}
            </TouchableOpacity>
          )}

          {isRecording && (
            <Text style={[styles.tapToStop, { color: colors.textSecondary }]}>
              Tap to stop recording
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    marginBottom: 20,
  },
  recordingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionsContainer: {
    alignItems: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  instructionsTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 22,
    marginBottom: 12,
    textAlign: 'center',
  },
  instructionsText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  waveformContainer: {
    height: 120,
    width: '100%',
    alignItems: 'center',
    marginBottom: 40,
  },
  durationText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    marginTop: 8,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  tapToStop: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    marginTop: 16,
  },
  processingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  processingText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    marginTop: 12,
  },
  transcriptionContainer: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    marginBottom: 40,
  },
  transcriptionTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    marginBottom: 8,
  },
  transcriptionText: {
    fontFamily: 'Inter-Regular',
    fontSize: 18,
    marginBottom: 16,
  },
  transcriptionNote: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transcriptionNoteText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    marginLeft: 6,
  },
  warning: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    marginTop: 4,
  },
  duration: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    marginTop: 4,
  },
});

