import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { useCurrency } from '@/context/CurrencyContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CircleStop as StopCircle } from 'lucide-react-native';
import RecordingWaveform from '@/components/RecordingWaveform';
import TransactionConfirmation from '@/components/TransactionConfirmation';
import CustomNotification from '@/components/CustomNotification';
import { NativeAdComponent } from '@/components/NativeAdComponent';
import { useNotification } from '@/hooks/useNotification';
import { useAI } from '@/utils/useAI';
import { useTransactionProcessor } from '@/hooks/useTransactionProcessor';
import { useAdMob } from '@/utils/admob';
import { router } from 'expo-router';

const MAX_RECORDING_DURATION = 20;

export default function RecordScreen() {
  const { showAdWithDelay } = useAdMob(['food', 'car', 'fruit', 'finance', 'app', 'kids', 'family', 'cooking', 'travel']);
  const { colors } = useTheme();
  const { selectedCurrency } = useCurrency();
  const insets = useSafeAreaInsets();
  const { notification, hideNotification, showWarning, showSuccess, showError } = useNotification();

  // Custom hooks
  const { transcribeAudio, isProcessing } = useAI({
    onError: (error) => showError('Processing Error', error),
    onFallback: (provider) => {
      if (provider === 'openai') {
        showWarning('Fallback', 'Using OpenAI as backup service');
      }
    }
  });
  const {
    parsedTransaction,
    processTranscription,
    saveTransaction,
    cancelTransaction
  } = useTransactionProcessor();

  // Recording state
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [transcription, setTranscription] = useState('');
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Auto-stop recording when max duration reached
  useEffect(() => {
    if (recordingDuration >= MAX_RECORDING_DURATION && isRecording) {
      stopRecording();
    }
  }, [recordingDuration, isRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getRemainingTime = () => MAX_RECORDING_DURATION - recordingDuration;

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        showWarning('Permission Required', 'You need to grant audio recording permissions to use this feature.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setIsRecording(true);
      setRecordingDuration(0);
      // @ts-expect-error
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording', err);
      showError('Recording Failed', 'There was an error starting the recording.');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      const uri = recording.getURI();
      if (!uri) {
        throw new Error('Recording URI is null');
      }

      // Store the recording URI for potential retry
      setRecordingUri(uri);

      // Transcribe and process
      const text = await transcribeAudio(uri);
      setTranscription(text);
      await processTranscription(text);
    } catch (err) {
      console.error('Failed to stop recording', err);
      showError('Error', 'Failed to stop recording');
    } finally {
      setRecording(null);
    }
  };

  const handleSaveTransaction = async (transaction: any) => {
    const success = await saveTransaction(transaction, transcription);
    if (success) {
      showSuccess('Success', 'Transaction saved successfully!', 2000)
      showAdWithDelay(3000, () => {
        router.replace('/');
      });
    }
    else {
      showError('Error', 'Failed to save transaction');
    }
  };

  const handleCancel = () => {
    setTranscription('');
    setRecordingUri(null);
    cancelTransaction();
  };

  /**
   * Handle retry analysis - re-transcribe the audio and re-process
   */
  const handleRetryAnalyze = async () => {
    console.log('🔄 Retry button clicked - starting retry analysis for audio');
    
    if (!recordingUri) {
      console.log('❌ No recording available for retry analysis');
      showError('Error', 'No audio recording available for re-analysis');
      return;
    }
    
    console.log('🧹 Clearing current data and re-transcribing audio from URI:', recordingUri);
    
    try {
      // Clear current data
      cancelTransaction();
      setTranscription('');
      
      // Re-transcribe the audio and process the new transcription
      const newTranscription = await transcribeAudio(recordingUri);
      setTranscription(newTranscription);
      await processTranscription(newTranscription);
      
      console.log('✅ Retry analysis completed with new transcription:', newTranscription);
    } catch (error) {
      console.error('Error retrying audio analysis:', error);
      showError('Error', 'Failed to re-analyze audio recording. Please try again.');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <Text style={[styles.header, { color: colors.text }]}>Record Transaction</Text>

      <CustomNotification notification={notification} onClose={hideNotification} />

      {parsedTransaction && parsedTransaction.amount !== undefined && parsedTransaction.category ? (
        <TransactionConfirmation
          transaction={parsedTransaction}
          onSave={handleSaveTransaction}
          onCancel={handleCancel}
          onRetryAnalyze={handleRetryAnalyze}
        />
      ) : (
        <View style={styles.recordingContainer}>
          <NativeAdComponent style={styles.nativeAdContainer} />
          {isProcessing ? (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.processingText, { color: colors.textSecondary }]}>
                Processing your recording...
              </Text>
            </View>
          ) : (
            <View style={styles.instructionsContainer}>
              <Text style={[styles.instructionsTitle, { color: colors.text }]}>
                {isRecording ? 'Recording...' : 'Record a Transaction'}
              </Text>
              <Text style={[styles.instructionsText, { color: colors.textSecondary }]}>
                {isRecording
                  ? 'Speak clearly about your transaction.'
                  : `Examples:\n"I spent ${selectedCurrency.symbol}24 on lunch today"\n"I received ${selectedCurrency.symbol}2000 from my salary"`}
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

          {!isProcessing && (
            <>
              <TouchableOpacity
                style={[styles.recordButton, { backgroundColor: isRecording ? colors.error : colors.primaryLight }]}
                onPress={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
              >
                {isRecording ? (
                  <StopCircle size={40} color={colors.white} />
                ) : (
                  <View style={styles.recordIconContainer}>
                    <Text style={styles.recordText}>Tap to</Text>
                    <Text style={styles.recordText}>Record</Text>
                  </View>
                )}
              </TouchableOpacity>
            </>
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
    marginBottom: 20,
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
  recordButton: {
    width: 100,
    height: 100,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  recordIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordText: {
    color: 'white',
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    textAlign: 'center',
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
  nativeAdContainer: {
    marginTop: 0,
    marginBottom: 20,
  },
});

