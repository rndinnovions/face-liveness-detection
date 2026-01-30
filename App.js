import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import RNFS from 'react-native-fs';
import ImageResizer from 'react-native-image-resizer';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'; // ← Import SafeAreaView too

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function App() {
  const camera = useRef(null);
  const device = useCameraDevice('front');
  const { hasPermission, requestPermission } = useCameraPermission();

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState([]);
  const [statusMessage, setStatusMessage] = useState('Press "Start" to begin liveness check');

  const MAX_FACES = 5;

  const boxAnims = useRef(
    Array.from({ length: MAX_FACES }, () => ({
      x: useSharedValue(0),
      y: useSharedValue(0),
      w: useSharedValue(0),
      h: useSharedValue(0),
    }))
  ).current;

  const boxAnimatedStyles = useRef(
    Array.from({ length: MAX_FACES }, (_, i) =>
      useAnimatedStyle(() => ({
        left: boxAnims[i].x.value,
        top: boxAnims[i].y.value,
        width: boxAnims[i].w.value,
        height: boxAnims[i].h.value,
      }))
    )
  ).current;

  const labelAnimatedStyles = useRef(
    Array.from({ length: MAX_FACES }, (_, i) =>
      useAnimatedStyle(() => ({
        left: boxAnims[i].x.value,
        top: boxAnims[i].y.value - 28,
      }))
    )
  ).current;

  // Request permission on mount
  useEffect(() => {
    if (!hasPermission) {
      (async () => {
        const granted = await requestPermission();
        if (!granted) {
          Alert.alert('Permission Denied', 'Camera access is required for liveness detection.');
        }
      })();
    }
  }, [hasPermission, requestPermission]);

  // Frame processing loop
  useEffect(() => {
    if (!isCameraActive || !device || !camera.current) return;

    const interval = setInterval(async () => {
      if (isProcessing || !camera.current) return;

      setIsProcessing(true);
      let snapshotPath = null;

      try {
        const snapshot = await camera.current.takePhoto({
          qualityPrioritization: 'quality',
        });
        snapshotPath = snapshot.path;

        const FIX_ROTATION = -90;

        const resized = await ImageResizer.createResizedImage(
          snapshot.path,
          640,
          1138,
          'JPEG',
          70,
          FIX_ROTATION,
          null,
          false,
          { mode: 'stretch', onlyScaleDown: true }
        );

        const base64 = `data:image/jpeg;base64,${await RNFS.readFile(resized.uri, 'base64')}`;

        const res = await fetch('http://88.222.215.142:8080/process_frame', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64 }),
        });

        if (!res.ok) throw new Error(`Server error ${res.status}`);

        const data = await res.json();
        const newResults = data.results || [];
        setResults(newResults);

        if (newResults.length > 0) {
          const first = newResults[0];
          setStatusMessage(
            first.is_real
              ? 'Real face detected ✓'
              : 'Spoof detected ✗ — please try again'
          );
        } else {
          setStatusMessage('No face detected — position your face clearly');
        }

        // newResults.forEach((r, i) => {
        //   if (i >= MAX_FACES) return;
        //   const a = boxAnims[i];
        //   a.x.value = withTiming(r.bbox.x, { duration: 140 });
        //   a.y.value = withTiming(r.bbox.y, { duration: 140 });
        //   a.w.value = withTiming(r.bbox.width, { duration: 140 });
        //   a.h.value = withTiming(r.bbox.height, { duration: 140 });
        // });
        newResults.forEach((r, i) => {
  if (i >= MAX_FACES) return;
  const a = boxAnims[i];

  const modelWidth  = 640;
  const modelHeight = 1138;

  // Calculate how the image was scaled & positioned inside 640×1138 with 'contain'
  const scale = Math.min(modelWidth / snapshot.width, modelHeight / snapshot.height); // but we don't have snapshot dimensions reliably → approximate
  // Better: compute letterbox areas
  const contentScale = Math.min(SCREEN_WIDTH / modelWidth, SCREEN_HEIGHT / modelHeight);
  // But simplest approximation for portrait phone + contain:
  const contentWidth  = modelWidth  * (SCREEN_HEIGHT / modelHeight);  // if height-limited
  const contentHeight = modelHeight * (SCREEN_WIDTH / modelWidth);    // if width-limited

  const finalScaleX = SCREEN_WIDTH  / modelWidth;
  const finalScaleY = SCREEN_HEIGHT / modelHeight;

  // If contain → shift offsets if letterboxed (centered)
  let offsetX = 0;
  let offsetY = 0;

  if (modelWidth / modelHeight > SCREEN_WIDTH / SCREEN_HEIGHT) {
    // Bars on top/bottom
    const actualContentHeight = modelHeight * (SCREEN_WIDTH / modelWidth);
    offsetY = (SCREEN_HEIGHT - actualContentHeight) / 2;
  } else {
    // Bars on sides
    const actualContentWidth = modelWidth * (SCREEN_HEIGHT / modelHeight);
    offsetX = (SCREEN_WIDTH - actualContentWidth) / 2;
  }

  const scaledX = r.bbox.x * finalScaleX + offsetX;
  const scaledY = r.bbox.y * finalScaleY + offsetY;
  const scaledW = r.bbox.width  * finalScaleX;
  const scaledH = r.bbox.height * finalScaleY;

  a.x.value = withTiming(scaledX,     { duration: 140 });
  a.y.value = withTiming(scaledY,     { duration: 140 });
  a.w.value = withTiming(scaledW,     { duration: 140 });
  a.h.value = withTiming(scaledH,     { duration: 140 });
});
      } catch 
      (err) {
        console.error('[FRAME ERROR]', err);
        setStatusMessage('Error processing frame');
      } finally {
        setIsProcessing(false);
        if (snapshotPath) RNFS.unlink(snapshotPath).catch(() => {});
      }
    }, 800);

    return () => clearInterval(interval);
  }, [isCameraActive, device]);

  const start = () => {
    if (!device) {
      Alert.alert('Error', 'No front camera found');
      return;
    }
    setIsCameraActive(true);
    setStatusMessage('Position your face in the frame');
  };

  const stop = () => {
    setIsCameraActive(false);
    setResults([]);
    setStatusMessage('Press "Start" to begin liveness check');
  };

  // Early returns: No device
  if (!device) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.center}>
          <Text style={styles.error}>No front camera available</Text>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  // Early returns: No permission
  if (!hasPermission) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.center}>
          <Text style={styles.error}>Camera permission required</Text>
          <TouchableOpacity style={styles.btnStart} onPress={requestPermission}>
            <Text style={styles.btnText}>Grant Permission</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  // Main UI
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Camera
            ref={camera}
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={isCameraActive}
            photo={true}
            outputOrientation="preview"
            isMirrored={true} // ← Important for front camera selfie view
          />

          {/* Overlay with face guide */}
          <View style={styles.overlay}>
            <View style={styles.guideFrame} />
          </View>

          {/* Detection boxes and labels */}
          {results.map((res, i) => {
            if (i >= MAX_FACES) return null;

            const isReal = res.is_real;

            const boxStyle = [
              styles.detectionBox,
              { borderColor: isReal ? '#00C853' : '#FF1744' },
              boxAnimatedStyles[i],
            ];

            const labelStyle = [
              styles.labelContainer,
              { backgroundColor: isReal ? '#00C853' : '#FF1744' },
              labelAnimatedStyles[i],
            ];

            return (
              <React.Fragment key={`face-${i}`}>
                <Animated.View style={boxStyle} />
                <Animated.View style={labelStyle}>
                  <Text style={styles.labelText}>
                    {res.label.split(':')[0].trim()}
                  </Text>
                </Animated.View>
              </React.Fragment>
            );
          })}

          {/* Status message */}
          <View style={styles.statusContainer}>
            {isProcessing && <ActivityIndicator size="large" color="#fff" />}
            <Text style={styles.statusText}>{statusMessage}</Text>
          </View>

          {/* Start/Stop button */}
          <View style={styles.controls}>
            {isCameraActive ? (
              <TouchableOpacity style={styles.btnStop} onPress={stop}>
                <Text style={styles.btnText}>Stop Detection</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.btnStart} onPress={start}>
                <Text style={styles.btnText}>Start Liveness Check</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000' },
  container: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideFrame: {
    width: SCREEN_WIDTH * 0.75,
    height: SCREEN_WIDTH * 0.95,
    borderRadius: SCREEN_WIDTH * 0.5,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  detectionBox: {
    position: 'absolute',
    borderWidth: 3,
    borderRadius: 12,
  },
  labelContainer: {
    position: 'absolute',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 90,
    alignItems: 'center',
  },
  labelText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  statusContainer: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.08,
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  statusText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  btnStart: {
    backgroundColor: '#00C853',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 50,
    elevation: 6,
  },
  btnStop: {
    backgroundColor: '#D50000',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 50,
    elevation: 6,
  },
  btnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  error: {
    color: '#FF5252',
    fontSize: 22,
    marginBottom: 24,
    textAlign: 'center',
  },
});