// import React, { useEffect, useState, useRef } from 'react';
// import {
//   StyleSheet,
//   View,
//   Text,
//   TouchableOpacity,
//   Alert,
//   Dimensions,
// } from 'react-native';
// import {
//   Camera,
//   useCameraDevice,
//   useCameraPermission,
// } from 'react-native-vision-camera';
// import Animated, {
//   useSharedValue,
//   useAnimatedStyle,
//   withTiming,
// } from 'react-native-reanimated';

// const { width: SCREEN_WIDTH } = Dimensions.get('window');

// export default function App() {
//   const camera = useRef(null); // ← Add this ref!

//   const device = useCameraDevice('front');
//   const { hasPermission, requestPermission } = useCameraPermission();

//   const [isCameraActive, setIsCameraActive] = useState(false);
//   const [isProcessing, setIsProcessing] = useState(false);
//   const [results, setResults] = useState([]);
//   const [statusText, setStatusText] = useState('Ready to start');

//   // Shared values for animated boxes (one per detected face)
//   const boxAnimsRef = useRef([]);

//   // Permission request
//   useEffect(() => {
//     (async () => {
//       if (!hasPermission) {
//         const granted = await requestPermission();
//         if (!granted) {
//           Alert.alert('Camera access denied', 'Please enable in settings.');
//         }
//       }
//     })();
//   }, [hasPermission, requestPermission]);

//   // Frame capture & send loop (every 200ms)
//   useEffect(() => {
//     if (!isCameraActive || !device || !camera.current) return;

//     const interval = setInterval(async () => {
//       if (isProcessing || !camera.current) return;
//       setIsProcessing(true);

//       try {
//         // Use camera ref to call takeSnapshot
//         const snapshot = await camera.current.takeSnapshot({
//           quality: 0.8, // 0-1, lower = smaller/faster
//         });

//         const base64 = `data:image/jpeg;base64,${snapshot.base64}`;
        
//         const response = await fetch('http://88.222.215.142:8080/process_frame', {
//           // ← CHANGE TO YOUR REAL BACKEND (e.g. http://192.168.1.100:5000/process_frame)
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({ image: base64 }),
//         });

//         if (!response.ok) {
//           throw new Error(`Server error: ${response.status}`);
//         }

//         const data = await response.json();
//         const newResults = data.results || [];

//         setResults(newResults);

//         // Animate/update boxes
//         newResults.forEach((res, index) => {
//           let anim = boxAnimsRef.current[index];
//           if (!anim) {
//             anim = {
//               x: useSharedValue(0),
//               y: useSharedValue(0),
//               w: useSharedValue(0),
//               h: useSharedValue(0),
//             };
//             boxAnimsRef.current[index] = anim;
//           }

//           anim.x.value = withTiming(res.bbox.x, { duration: 120 });
//           anim.y.value = withTiming(res.bbox.y, { duration: 120 });
//           anim.w.value = withTiming(res.bbox.width, { duration: 120 });
//           anim.h.value = withTiming(res.bbox.height, { duration: 120 });
//         });

//         // Trim old animations if fewer faces now
//         if (newResults.length < boxAnimsRef.current.length) {
//           boxAnimsRef.current.length = newResults.length;
//         }
//       } catch (err) {
//         console.error('Processing failed:', err);
//       } finally {
//         setIsProcessing(false);
//       }
//     }, 200); // 5 fps like your web demo

//     return () => clearInterval(interval);
//   }, [isCameraActive, device, isProcessing]);

//   const startCamera = () => {
//     if (!device) {
//       Alert.alert('No front camera found');
//       return;
//     }
//     setIsCameraActive(true);
//     setStatusText('Camera active. Analyzing...');
//   };

//   const stopCamera = () => {
//     setIsCameraActive(false);
//     setResults([]);
//     boxAnimsRef.current = [];
//     setStatusText('Camera stopped.');
//   };

//   if (!device) {
//     return <Text style={styles.centerText}>No front camera available</Text>;
//   }

//   if (!hasPermission) {
//     return (
//       <View style={styles.center}>
//         <Text style={styles.error}>Camera permission is required</Text>
//         <TouchableOpacity onPress={requestPermission} style={styles.btn}>
//           <Text style={styles.btnText}>Request Permission</Text>
//         </TouchableOpacity>
//       </View>
//     );
//   }

//   return (
//     <View style={styles.container}>
//       <Camera
//         ref={camera} // ← Attach the ref here!
//         style={StyleSheet.absoluteFill}
//         device={device}
//         isActive={isCameraActive}
//         photo={true} // Required for takeSnapshot / takePhoto
//       />

//       {/* Bounding boxes + labels */}
//       {results.map((res, index) => {
//         const anim = boxAnimsRef.current[index];

//         const boxStyle = useAnimatedStyle(() => ({
//           position: 'absolute',
//           borderWidth: 3,
//           borderColor: res.is_real ? '#00E676' : '#FF1744',
//           left: anim.x.value,
//           top: anim.y.value,
//           width: anim.w.value,
//           height: anim.h.value,
//           borderRadius: 8,
//         }));

//         const labelStyle = {
//           position: 'absolute',
//           left: anim?.x?.value?._value || 0, // safe access for initial render
//           top: (anim?.y?.value?._value || 0) - 32,
//           backgroundColor: res.is_real ? '#00E676' : '#FF1744',
//           paddingHorizontal: 10,
//           paddingVertical: 4,
//           borderRadius: 6,
//         };

//         return (
//           <React.Fragment key={index}>
//             <Animated.View style={boxStyle} />

//             <View style={labelStyle}>
//               <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>
//                 {res.label}
//               </Text>
//             </View>
//           </React.Fragment>
//         );
//       })}

//       {/* UI Controls */}
//       <View style={styles.controls}>
//         {!isCameraActive ? (
//           <TouchableOpacity style={[styles.btn, styles.primary]} onPress={startCamera}>
//             <Text style={styles.btnText}>Start Camera</Text>
//           </TouchableOpacity>
//         ) : (
//           <TouchableOpacity style={[styles.btn, styles.secondary]} onPress={stopCamera}>
//             <Text style={styles.btnText}>Stop Camera</Text>
//           </TouchableOpacity>
//         )}
//       </View>

//       <Text style={styles.status}>{statusText}</Text>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#000' },
//   center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
//   centerText: { color: '#fff', fontSize: 18, textAlign: 'center', textAlignVertical: 'center' },
//   error: { color: '#ff4444', fontSize: 20, marginBottom: 20, textAlign: 'center' },
//   controls: { position: 'absolute', bottom: 60, left: 0, right: 0, alignItems: 'center' },
//   btn: { paddingVertical: 14, paddingHorizontal: 40, borderRadius: 30, elevation: 4 },
//   primary: { backgroundColor: '#007AFF' },
//   secondary: { backgroundColor: '#FF3B30' },
//   btnText: { color: '#fff', fontSize: 18, fontWeight: '600' },
//   status: {
//     position: 'absolute',
//     bottom: 120,
//     alignSelf: 'center',
//     color: '#fff',
//     fontSize: 16,
//     backgroundColor: 'rgba(0,0,0,0.5)',
//     paddingHorizontal: 16,
//     paddingVertical: 8,
//     borderRadius: 20,
//   },
// });




// import React, { useEffect, useState, useRef } from 'react';
// import {
//   StyleSheet,
//   View,
//   Text,
//   TouchableOpacity,
//   Alert,
//   Dimensions,
// } from 'react-native';
// import {
//   Camera,
//   useCameraDevice,
//   useCameraPermission,
// } from 'react-native-vision-camera';
// import Animated, {
//   useSharedValue,
//   useAnimatedStyle,
//   withTiming,
// } from 'react-native-reanimated';

// // Simple timestamp helper for logs
// const log = (msg, ...args) => {
//   const time = new Date().toISOString().slice(11, 19); // HH:mm:ss
//   console.log(`[${time}] ${msg}`, ...args);
// };

// export default function App() {
//   const camera = useRef(null);

//   const device = useCameraDevice('front');
//   const { hasPermission, requestPermission } = useCameraPermission();

//   const [isCameraActive, setIsCameraActive] = useState(false);
//   const [isProcessing, setIsProcessing] = useState(false);
//   const [results, setResults] = useState([]);
//   const [statusText, setStatusText] = useState('Ready to start');

//   const boxAnimsRef = useRef([]);

//   // Permission request
//   useEffect(() => {
//     (async () => {
//       log('Checking camera permission...');
//       if (!hasPermission) {
//         log('No permission yet → requesting');
//         const granted = await requestPermission();
//         log('Permission request result:', granted ? 'granted' : 'denied');
//         if (!granted) {
//           Alert.alert('Camera access denied', 'Please enable in settings.');
//         }
//       } else {
//         log('Permission already granted');
//       }
//     })();
//   }, [hasPermission, requestPermission]);

//   // Frame capture & send loop
//   useEffect(() => {
//     if (!isCameraActive || !device || !camera.current) {
//       log('Frame loop condition not met → skipping interval setup');
//       return;
//     }

//     log('Starting frame capture interval (200ms)');

//     const interval = setInterval(async () => {
//       if (isProcessing || !camera.current) {
//         log('Skip frame → already processing or camera ref missing');
//         return;
//       }

//       setIsProcessing(true);
//       log('Processing new frame...');

//       try {
//         log('Taking snapshot...');
//         const snapshot = await camera.current.takeSnapshot({
//           quality: 0.6,
//         });

//         log('Snapshot taken → path:', snapshot.path);
//         log('Image size:', snapshot.size, 'bytes   width:', snapshot.width, 'height:', snapshot.height);

//         if (!snapshot?.path) {
//           throw new Error('No path in snapshot');
//         }

//         // Create FormData
//         const formData = new FormData();
//         formData.append('image', {
//           uri: snapshot.path,
//           type: 'image/jpeg',
//           name: 'frame.jpg',
//         });

//         log('Sending multipart request...');
//         const response = await fetch('http://88.222.215.142:8080/process_frame', {
//           method: 'POST',
//           body: formData,
//         });

//         log('Server responded with status:', response.status);

//         if (!response.ok) {
//           const errorText = await response.text().catch(() => 'No response body');
//           throw new Error(`Server error: ${response.status} - ${errorText}`);
//         }

//         log('Parsing JSON response...');
//         const data = await response.json();
//         const newResults = data.results || [];

//         log('Received results count:', newResults.length);
//         if (newResults.length > 0) {
//           log('First result example:', JSON.stringify(newResults[0], null, 2));
//         }

//         setResults(newResults);

//         // Animate boxes
//         log('Animating bounding boxes...');
//         newResults.forEach((res, index) => {
//           let anim = boxAnimsRef.current[index];
//           if (!anim) {
//             anim = {
//               x: useSharedValue(0),
//               y: useSharedValue(0),
//               w: useSharedValue(0),
//               h: useSharedValue(0),
//             };
//             boxAnimsRef.current[index] = anim;
//             log(`Created new animation ref for face #${index}`);
//           }

//           anim.x.value = withTiming(res.bbox.x, { duration: 120 });
//           anim.y.value = withTiming(res.bbox.y, { duration: 120 });
//           anim.w.value = withTiming(res.bbox.width, { duration: 120 });
//           anim.h.value = withTiming(res.bbox.height, { duration: 120 });
//         });

//         if (newResults.length < boxAnimsRef.current.length) {
//           log(`Trimming old animation refs from ${boxAnimsRef.current.length} to ${newResults.length}`);
//           boxAnimsRef.current.length = newResults.length;
//         }
//       } catch (err) {
//         console.error('[ERROR] Processing failed:', err);
//         log('Error details:', err.message || err);
//       } finally {
//         setIsProcessing(false);
//         log('Frame processing finished');
//       }
//     }, 200);

//     return () => {
//       log('Clearing frame interval');
//       clearInterval(interval);
//     };
//   }, [isCameraActive, device, isProcessing]);

//   const startCamera = () => {
//     if (!device) {
//       log('Start attempted → no front camera');
//       Alert.alert('No front camera found');
//       return;
//     }
//     log('Start Camera pressed');
//     setIsCameraActive(true);
//     setStatusText('Camera active. Analyzing...');
//   };

//   const stopCamera = () => {
//     log('Stop Camera pressed');
//     setIsCameraActive(false);
//     setResults([]);
//     boxAnimsRef.current = [];
//     setStatusText('Camera stopped.');
//   };

//   if (!device) {
//     log('No front camera detected on device');
//     return <Text style={styles.centerText}>No front camera available</Text>;
//   }

//   if (!hasPermission) {
//     log('Showing permission request screen');
//     return (
//       <View style={styles.center}>
//         <Text style={styles.error}>Camera permission is required</Text>
//         <TouchableOpacity onPress={requestPermission} style={styles.btn}>
//           <Text style={styles.btnText}>Request Permission</Text>
//         </TouchableOpacity>
//       </View>
//     );
//   }

//   log('Rendering main camera UI');

//   return (
//     <View style={styles.container}>
//       <Camera
//         ref={camera}
//         style={StyleSheet.absoluteFill}
//         device={device}
//         isActive={isCameraActive}
//         photo={true}
//       />

//       {results.map((res, index) => {
//         const anim = boxAnimsRef.current[index];

//         const boxStyle = useAnimatedStyle(() => ({
//           position: 'absolute',
//           borderWidth: 3,
//           borderColor: res.is_real ? '#00E676' : '#FF1744',
//           left: anim.x.value,
//           top: anim.y.value,
//           width: anim.w.value,
//           height: anim.h.value,
//           borderRadius: 8,
//         }));

//         const labelStyle = {
//           position: 'absolute',
//           left: anim?.x?.value?._value || 0,
//           top: (anim?.y?.value?._value || 0) - 32,
//           backgroundColor: res.is_real ? '#00E676' : '#FF1744',
//           paddingHorizontal: 10,
//           paddingVertical: 4,
//           borderRadius: 6,
//         };

//         return (
//           <React.Fragment key={index}>
//             <Animated.View style={boxStyle} />
//             <View style={labelStyle}>
//               <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>
//                 {res.label}
//               </Text>
//             </View>
//           </React.Fragment>
//         );
//       })}

//       <View style={styles.controls}>
//         {!isCameraActive ? (
//           <TouchableOpacity style={[styles.btn, styles.primary]} onPress={startCamera}>
//             <Text style={styles.btnText}>Start Camera</Text>
//           </TouchableOpacity>
//         ) : (
//           <TouchableOpacity style={[styles.btn, styles.secondary]} onPress={stopCamera}>
//             <Text style={styles.btnText}>Stop Camera</Text>
//           </TouchableOpacity>
//         )}
//       </View>

//       <Text style={styles.status}>{statusText}</Text>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#000' },
//   center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
//   centerText: { color: '#fff', fontSize: 18, textAlign: 'center', textAlignVertical: 'center' },
//   error: { color: '#ff4444', fontSize: 20, marginBottom: 20, textAlign: 'center' },
//   controls: { position: 'absolute', bottom: 60, left: 0, right: 0, alignItems: 'center' },
//   btn: { paddingVertical: 14, paddingHorizontal: 40, borderRadius: 30, elevation: 4 },
//   primary: { backgroundColor: '#007AFF' },
//   secondary: { backgroundColor: '#FF3B30' },
//   btnText: { color: '#fff', fontSize: 18, fontWeight: '600' },
//   status: {
//     position: 'absolute',
//     bottom: 120,
//     alignSelf: 'center',
//     color: '#fff',
//     fontSize: 16,
//     backgroundColor: 'rgba(0,0,0,0.5)',
//     paddingHorizontal: 16,
//     paddingVertical: 8,
//     borderRadius: 20,
//   },
// });






import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  Dimensions,
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
import RNFS from 'react-native-fs'; // ← added
import ImageResizer from 'react-native-image-resizer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function App() {
  const camera = useRef(null);

  const device = useCameraDevice('front');
  const { hasPermission, requestPermission } = useCameraPermission();

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState([]);
  const [statusText, setStatusText] = useState('Ready to start');

  const boxAnimsRef = useRef([]);

  // Permission flow
  useEffect(() => {
    (async () => {
      console.log('[PERMISSION] Checking camera permission...');
      if (!hasPermission) {
        console.log('[PERMISSION] No permission yet → requesting');
        const granted = await requestPermission();
        if (granted) {
          console.log('[PERMISSION] Granted ✅');
        } else {
          console.log('[PERMISSION] Denied ❌');
          Alert.alert('Camera access denied', 'Please enable in settings.');
        }
      } else {
        console.log('[PERMISSION] Already granted');
      }
    })();
  }, [hasPermission, requestPermission]);

  // Frame processing loop
  useEffect(() => {
    if (!isCameraActive || !device || !camera.current) {
      console.log('[FRAME LOOP] Not starting →', {
        isCameraActive,
        hasDevice: !!device,
        hasCameraRef: !!camera.current,
      });
      return;
    }

    console.log('[FRAME LOOP] Starting interval (200ms)');

    const interval = setInterval(async () => {
      if (isProcessing) {
        console.log('[FRAME] Still processing previous frame → skipping');
        return;
      }

      if (!camera.current) {
        console.log('[FRAME] Camera ref lost → stopping');
        return;
      }

      setIsProcessing(true);
      console.log('[FRAME] Capturing snapshot...');

      let snapshotPath = null;

      try {
        const snapshot = await camera.current.takePhoto({
          // quality: 0.9, 
            qualityPrioritization: 'quality',
        });

        snapshotPath = snapshot.path;

        console.log('[SNAPSHOT] Captured →', {
          path: snapshot.path,
          width: snapshot.width,
          height: snapshot.height,
          orientation: snapshot.orientation,
          reportedOrientation: snapshot.orientation,
        });
        const FIX_ROTATION = 90;
        if (!snapshot.path) {
          throw new Error('No path returned from takeSnapshot');
        }

// 🔽 Resize + Compress BEFORE converting to base64
const resizedImage = await ImageResizer.createResizedImage(
  snapshot.path,
  640,   // width
  640,   // height
  'JPEG',
  70,
  FIX_ROTATION,            // ← this is what fixes the rotation
  null,
  false,
  { mode: 'contain', onlyScaleDown: true }
);

console.log('[RESIZE] New image →', resizedImage.uri);
console.log('[RESIZE]', {
  uri: resizedImage.uri,
  width: resizedImage.width,
  height: resizedImage.height,
  rotationApplied: FIX_ROTATION,
});
// Convert resized file to base64
const rawBase64 = await RNFS.readFile(resizedImage.uri, 'base64');
const base64 = `data:image/jpeg;base64,${rawBase64}`;

console.log('[BASE64] Size after resize:', base64.length);


        console.log('[BASE64] Generated —', base64);

        if (base64.length < 1000) {
          throw new Error('Base64 string is too short – capture failed?');
        }

        console.log('[FRAME] Sending to backend (base64 length:', base64.length, ')');

        const response = await fetch('http://88.222.215.142:8080/process_frame', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64 }), // pure base64 – no prefix
        });

        console.log('[FRAME] Server responded — status:', response.status);

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'No response body');
          console.log('[SERVER ERROR BODY]:', errorText);
          throw new Error(`Server error: ${response.status} – ${errorText}`);
        }

        const data = await response.json();
        const newResults = data.results || [];

        console.log('[FRAME] Received results — count:', newResults.length);
        if (newResults.length > 0) {
          console.log('[FRAME] First result example:', JSON.stringify(newResults[0], null, 2));
        }

        setResults(newResults);

        // Animate boxes
        newResults.forEach((res, index) => {
          let anim = boxAnimsRef.current[index];

          if (!anim) {
            console.log(`[ANIM] Creating animation object for face #${index}`);
            anim = {
              x: useSharedValue(0),
              y: useSharedValue(0),
              w: useSharedValue(0),
              h: useSharedValue(0),
            };
            boxAnimsRef.current[index] = anim;
          }

          anim.x.value = withTiming(res.bbox.x, { duration: 120 });
          anim.y.value = withTiming(res.bbox.y, { duration: 120 });
          anim.w.value = withTiming(res.bbox.width, { duration: 120 });
          anim.h.value = withTiming(res.bbox.height, { duration: 120 });
        });

        if (newResults.length < boxAnimsRef.current.length) {
          console.log(
            `[ANIM] Trimming: ${boxAnimsRef.current.length} → ${newResults.length}`
          );
          boxAnimsRef.current.length = newResults.length;
        }
      } catch (err) {
        console.error('[FRAME ERROR]', err.message);
      } finally {
        setIsProcessing(false);

        // Clean up temporary file
        if (snapshotPath) {
          RNFS.unlink(snapshotPath).catch((e) =>
            console.log('[CLEANUP] Could not delete temp file:', e.message)
          );
        }
      }
    }, 700);

    return () => {
      console.log('[FRAME LOOP] Clearing interval');
      clearInterval(interval);
    };
  }, [isCameraActive, device, isProcessing]);

  const startCamera = () => {
    if (!device) {
      console.log('[UI] Start pressed — no front camera');
      Alert.alert('No front camera found');
      return;
    }
    console.log('[UI] Starting camera');
    setIsCameraActive(true);
    setStatusText('Camera active. Analyzing...');
  };

  const stopCamera = () => {
    console.log('[UI] Stopping camera');
    setIsCameraActive(false);
    setResults([]);
    boxAnimsRef.current = [];
    setStatusText('Camera stopped.');
  };

  if (!device) {
    console.log('[INIT] No front camera detected');
    return <Text style={styles.centerText}>No front camera available</Text>;
  }

  if (!hasPermission) {
    console.log('[INIT] Waiting for permission');
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Camera permission is required</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.btn}>
          <Text style={styles.btnText}>Request Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={camera}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isCameraActive}
        photo={true}
        video={true} // required for snapshots on iOS
        outputOrientation="preview"
      />

      {results.map((res, index) => {
        const anim = boxAnimsRef.current[index];

        const boxStyle = useAnimatedStyle(() => ({
          position: 'absolute',
          borderWidth: 3,
          borderColor: res.is_real ? '#00E676' : '#FF1744',
          left: anim.x.value,
          top: anim.y.value,
          width: anim.w.value,
          height: anim.h.value,
          borderRadius: 8,
        }));

        const labelStyle = {
          position: 'absolute',
          left: anim?.x?.value?._value || 0,
          top: (anim?.y?.value?._value || 0) - 32,
          backgroundColor: res.is_real ? '#00E676' : '#FF1744',
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 6,
        };

        return (
          <React.Fragment key={index}>
            <Animated.View style={boxStyle} />
            <View style={labelStyle}>
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>
                {res.label}
              </Text>
            </View>
          </React.Fragment>
        );
      })}

      <View style={styles.controls}>
        {!isCameraActive ? (
          <TouchableOpacity style={[styles.btn, styles.primary]} onPress={startCamera}>
            <Text style={styles.btnText}>Start Camera</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.btn, styles.secondary]} onPress={stopCamera}>
            <Text style={styles.btnText}>Stop Camera</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.status}>{statusText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  centerText: { color: '#fff', fontSize: 18, textAlign: 'center', textAlignVertical: 'center' },
  error: { color: '#ff4444', fontSize: 20, marginBottom: 20, textAlign: 'center' },
  controls: { position: 'absolute', bottom: 60, left: 0, right: 0, alignItems: 'center' },
  btn: { paddingVertical: 14, paddingHorizontal: 40, borderRadius: 30, elevation: 4 },
  primary: { backgroundColor: '#007AFF' },
  secondary: { backgroundColor: '#FF3B30' },
  btnText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  status: {
    position: 'absolute',
    bottom: 120,
    alignSelf: 'center',
    color: '#fff',
    fontSize: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
});