import React, { useEffect, useState, useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRM } from '@pixiv/three-vrm';
import { useInterviewStore } from '../store/interviewStore';
import { Avatar2D } from './Avatar2D';
import { AlertCircle, Box } from 'lucide-react';

const VRMModel: React.FC<{ url: string }> = ({ url }) => {
  const [vrm, setVrm] = useState<VRM | null>(null);
  const { roryState, currentMouthShape, currentMouthOpening } = useInterviewStore();
  const vrmRef = useRef<VRM | null>(null);

  useEffect(() => {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    loader.load(
      url,
      (gltf) => {
        const loadedVrm = gltf.userData.vrm as VRM;
        if (loadedVrm) {
          loadedVrm.scene.rotation.y = Math.PI;
          setVrm(loadedVrm);
          vrmRef.current = loadedVrm;
        }
      },
      undefined,
      (err) => {
        console.warn('VRM load error:', err);
      }
    );

    return () => {
      if (vrmRef.current) {
        // cleanup scene
      }
    };
  }, [url]);

  useFrame((_, delta) => {
    if (!vrm) return;
    vrm.update(delta);

    // Lip sync blendshapes
    const em = vrm.expressionManager;
    if (em) {
      // Reset vowel shapes
      em.setValue('aa', 0);
      em.setValue('ih', 0);
      em.setValue('ou', 0);
      em.setValue('ee', 0);
      em.setValue('oh', 0);

      if (roryState === 'speaking') {
        if (currentMouthShape === 'open') em.setValue('aa', currentMouthOpening);
        else if (currentMouthShape === 'wide') em.setValue('ee', currentMouthOpening);
        else if (currentMouthShape === 'round') em.setValue('oh', currentMouthOpening);
        else if (currentMouthShape === 'small') em.setValue('ou', currentMouthOpening * 0.5);
      }

      // Blink animation
      if (Math.random() < 0.01) {
        em.setValue('blink', 1.0);
      } else {
        em.setValue('blink', 0.0);
      }
    }
  });

  if (!vrm) return null;

  return <primitive object={vrm.scene} position={[0, -1.2, 0]} scale={1.8} />;
};

export const Avatar3D: React.FC = () => {
  const [vrmExists, setVrmExists] = useState<boolean | null>(null);
  const vrmUrl = '/models/rory.vrm';

  useEffect(() => {
    fetch(vrmUrl, { method: 'HEAD' })
      .then((res) => {
        if (res.ok) setVrmExists(true);
        else setVrmExists(false);
      })
      .catch(() => setVrmExists(false));
  }, []);

  if (vrmExists === false) {
    return (
      <div className="relative w-full">
        <Avatar2D />
        <div className="mt-2 flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>
            3D VRM file not found at <code>/public/models/rory.vrm</code>. Fallback to 2D avatar active. (Add any free VRM from VRoid Studio to activate 3D).
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[420px] lg:h-[480px] rounded-3xl overflow-hidden bg-gradient-to-b from-slate-950 via-[#0d1424] to-[#070a12] border border-brand-500/20 shadow-2xl">
      <div className="absolute top-6 left-6 z-10 flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-700/60 backdrop-blur-md">
        <Box className="w-3.5 h-3.5 text-brand-400" />
        <span className="text-xs font-medium text-slate-300">3D VRM Mode</span>
      </div>

      <Canvas camera={{ position: [0, 0.4, 1.8], fov: 40 }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[1, 2, 2]} intensity={1.2} />
        <pointLight position={[-2, 1, 1]} intensity={0.5} color="#818cf8" />
        <Suspense fallback={null}>
          <VRMModel url={vrmUrl} />
        </Suspense>
        <OrbitControls enablePan={false} maxPolarAngle={Math.PI / 2} minDistance={1.2} maxDistance={2.5} />
      </Canvas>
    </div>
  );
};
