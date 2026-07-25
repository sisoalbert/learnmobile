declare module 'lottie-web' {
  export interface AnimationItem {
    play(): void;
    stop(): void;
    pause(): void;
    setSpeed(speed: number): void;
    setDirection(direction: number): void;
    destroy(): void;
  }

  export interface AnimationConfig {
    container: Element;
    renderer?: 'svg' | 'canvas' | 'html';
    loop?: boolean | number;
    autoplay?: boolean;
    animationData?: any;
    path?: string;
  }

  const lottie: {
    loadAnimation(config: AnimationConfig): AnimationItem;
  };

  export default lottie;
}
