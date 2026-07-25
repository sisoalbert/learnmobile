import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import LottieViewNative, { LottieViewProps } from 'lottie-react-native';

export interface UniversalLottieProps extends Omit<LottieViewProps, 'style'> {
  source: any;
  autoPlay?: boolean;
  loop?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const LottieView: React.FC<UniversalLottieProps> = ({
  source,
  autoPlay = true,
  loop = true,
  style,
  ...props
}) => {
  return (
    <LottieViewNative
      source={source}
      autoPlay={autoPlay}
      loop={loop}
      style={style}
      {...props}
    />
  );
};

export default LottieView;
