import React, { useEffect, useRef } from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import lottie, { AnimationItem } from 'lottie-web';

export interface UniversalLottieProps {
  source: any;
  autoPlay?: boolean;
  loop?: boolean;
  style?: StyleProp<ViewStyle>;
  speed?: number;
}

export const LottieView: React.FC<UniversalLottieProps> = ({
  source,
  autoPlay = true,
  loop = true,
  style,
  speed = 1,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<AnimationItem | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const animationData = typeof source === 'object' ? source : undefined;
    const path = typeof source === 'string' ? source : undefined;

    animRef.current = lottie.loadAnimation({
      container: containerRef.current,
      renderer: 'svg',
      loop,
      autoplay: autoPlay,
      animationData,
      path,
    });

    if (animRef.current) {
      animRef.current.setSpeed(speed);
    }

    return () => {
      animRef.current?.destroy();
    };
  }, [source, autoPlay, loop, speed]);

  return (
    <View style={style}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </View>
  );
};

export default LottieView;
